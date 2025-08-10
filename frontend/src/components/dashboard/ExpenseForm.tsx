import React, { useState, useEffect, useMemo } from 'react';
import type { Expense, ExpensePostData, Unit, Competence } from '../../types';
import { ExpenseType, SubtypeEncargo, MarketType } from '../../types';
import { EXPENSE_TYPE_OPTIONS, SUBTYPE_ENCARGO_OPTIONS } from '../../constants';
import { api } from '../../services/api';
import _ from 'lodash';
import toast from 'react-hot-toast';

interface ExpenseFormProps {
  expenseToEdit?: Expense | null;
  units: Unit[];
  competences: Competence[];
  onCancel: () => void;
  onSave: () => void;
  setIsDirty: (isDirty: boolean) => void;
}

const getInitialFormData = () => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    return {
        unidadeId: '',
        competencia: currentMonth,
        tipoDespesa: ExpenseType.COMERCIALIZADORA,
        subtipoEncargo: null,
        valor: '',
        vencimento: '',
        codigoLancamento: '',
        detalhesDistribuidora: null,
    };
};

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expenseToEdit, units, competences, onCancel, onSave, setIsDirty }) => {
  const [formData, setFormData] = useState<Omit<ExpensePostData, "valor"> & { valor: string | number }>(getInitialFormData());
  const [initialState, setInitialState] = useState(getInitialFormData());
  const [loading, setLoading] = useState(false);

  const currentMarketType = useMemo(() => {
    return units.find(u => u._id === formData.unidadeId)?.marketType;
  }, [formData.unidadeId, units]);

  useEffect(() => {
    let stateToSet;
    if (expenseToEdit) {
      const comp = competences.find(c => c._id === expenseToEdit.competenciaId);
      const competenciaString = comp ? `${comp.ano}-${String(comp.mes).padStart(2, '0')}` : '';

      stateToSet = {
        unidadeId: expenseToEdit.unidadeId,
        competencia: competenciaString,
        tipoDespesa: expenseToEdit.tipoDespesa,
        subtipoEncargo: expenseToEdit.subtipoEncargo,
        valor: expenseToEdit.valor,
        vencimento: new Date(expenseToEdit.vencimento).toISOString().split('T')[0],
        codigoLancamento: expenseToEdit.codigoLancamento || '',
        detalhesDistribuidora: expenseToEdit.detalhesDistribuidora,
      };
    } else {
      stateToSet = getInitialFormData();
    }
    setFormData(stateToSet);
    setInitialState(stateToSet);
    setIsDirty(false);
  }, [expenseToEdit, competences, setIsDirty]);

   useEffect(() => {
        const isDirty = !_.isEqual(formData, initialState);
        setIsDirty(isDirty);
    }, [formData, initialState, setIsDirty]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
        let newState = { ...prev, [name]: value };

        // Handle cascading changes based on Unit selection
        if (name === 'unidadeId') {
            const selectedUnit = units.find(u => u._id === value);
            if (selectedUnit?.marketType === MarketType.CATIVO) {
                newState.tipoDespesa = ExpenseType.DISTRIBUIDORA;
                newState.subtipoEncargo = null;
                if (!newState.detalhesDistribuidora) {
                    newState.detalhesDistribuidora = { consumoMWh: 0, reativoKWh: 0, reativoValor: 0, demandaUltrKW: 0, demandaUltrValor: 0 };
                }
            } else { // MarketType.LIVRE
                 if (newState.tipoDespesa === ExpenseType.DISTRIBUIDORA && !newState.detalhesDistribuidora) {
                     newState.detalhesDistribuidora = { consumoMWh: 0, reativoKWh: 0, reativoValor: 0, demandaUltrKW: 0, demandaUltrValor: 0 };
                 } else if (newState.tipoDespesa !== ExpenseType.DISTRIBUIDORA) {
                    newState.detalhesDistribuidora = null;
                 }
            }
        }

        // Handle cascading changes based on Expense Type selection
        if (name === 'tipoDespesa') {
            newState.subtipoEncargo = null; // Reset subtype if main type changes
             if (value === ExpenseType.DISTRIBUIDORA && !newState.detalhesDistribuidora) {
                newState.detalhesDistribuidora = { consumoMWh: 0, reativoKWh: 0, reativoValor: 0, demandaUltrKW: 0, demandaUltrValor: 0 };
             } else if (value !== ExpenseType.DISTRIBUIDORA) {
                newState.detalhesDistribuidora = null;
             }
        }
        
        return newState;
    });
  };


  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      detalhesDistribuidora: {
        ...(prev.detalhesDistribuidora!),
        [name]: parseFloat(value) || 0,
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.unidadeId || !formData.competencia || !formData.vencimento || !formData.valor || Number(formData.valor) <= 0) {
      toast.error('Por favor, preencha todos os campos obrigatórios (*).');
      setLoading(false);
      return;
    }
    
    const dataToSave: ExpensePostData = {
        unidadeId: formData.unidadeId,
        competencia: formData.competencia,
        tipoDespesa: formData.tipoDespesa,
        subtipoEncargo: formData.subtipoEncargo,
        valor: Number(formData.valor),
        vencimento: new Date(formData.vencimento).toISOString(),
        codigoLancamento: formData.codigoLancamento,
        detalhesDistribuidora: formData.detalhesDistribuidora
    };

    try {
      if (expenseToEdit) {
        await api.updateExpense(expenseToEdit._id, dataToSave);
      } else {
        await api.createExpense(dataToSave);
      }
      onSave();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro ao salvar a despesa.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  
  const renderLabel = (text: string, required: boolean = false) => (
    <label className="block text-sm font-medium text-gray-300 mb-1">{text}{required && <span className="text-red-500 ml-1">*</span>}</label>
  );

  const commonInputClass = "mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 disabled:bg-gray-600/50 disabled:cursor-not-allowed";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {renderLabel('Unidade', true)}
          <select name="unidadeId" value={formData.unidadeId} onChange={handleChange} className={commonInputClass} required>
            <option value="">Selecione a Unidade</option>
            {units.map(u => <option key={u._id} value={u._id}>{u.nome} ({u.marketType})</option>)}
          </select>
        </div>
        <div>
          {renderLabel('Competência', true)}
          <input type="month" name="competencia" value={formData.competencia} onChange={handleChange} className={commonInputClass} required />
        </div>
        <div>
          {renderLabel('Tipo de Despesa', true)}
          <select name="tipoDespesa" value={formData.tipoDespesa} onChange={handleChange} className={commonInputClass} required disabled={currentMarketType === MarketType.CATIVO}>
            {EXPENSE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
         <div>
          {renderLabel('Vencimento', true)}
          <input type="date" name="vencimento" value={formData.vencimento} onChange={handleChange} className={commonInputClass} required />
        </div>
        <div>
          {renderLabel('Valor (R$)', true)}
          <input type="number" step="0.01" name="valor" placeholder="1234.56" value={formData.valor} onChange={handleChange} className={commonInputClass} required />
        </div>
        <div>
          {renderLabel('Código do Lançamento (Opcional)')}
          <input type="text" name="codigoLancamento" placeholder="Ex: 813032" value={formData.codigoLancamento || ''} onChange={handleChange} className={commonInputClass} />
        </div>
      </div>
      
      {currentMarketType === MarketType.LIVRE && formData.tipoDespesa === ExpenseType.ENCARGO && (
        <div className="pt-4 border-t border-gray-700">
          <h4 className="text-md font-semibold text-gray-200 mb-2">Detalhes do Encargo</h4>
          {renderLabel('Subtipo de Encargo', true)}
          <select name="subtipoEncargo" value={formData.subtipoEncargo || ''} onChange={handleChange} className={commonInputClass} required>
            <option value="">Selecione o subtipo</option>
            {SUBTYPE_ENCARGO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {formData.tipoDespesa === ExpenseType.DISTRIBUIDORA && (
        <div className="pt-4 border-t border-gray-700">
           <h4 className="text-md font-semibold text-gray-200 mb-4">Detalhes da Distribuidora</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              {renderLabel('Consumo (MWh)')}
              <input type="number" step="any" name="consumoMWh" value={formData.detalhesDistribuidora?.consumoMWh || ''} onChange={handleDetailsChange} className={commonInputClass} />
            </div>
            <div>
              {renderLabel('Reativo (KWh)')}
              <input type="number" step="any" name="reativoKWh" value={formData.detalhesDistribuidora?.reativoKWh || ''} onChange={handleDetailsChange} className={commonInputClass} />
            </div>
            <div>
              {renderLabel('Valor Reativo (R$)')}
              <input type="number" step="0.01" name="reativoValor" value={formData.detalhesDistribuidora?.reativoValor || ''} onChange={handleDetailsChange} className={commonInputClass} />
            </div>
            <div>
              {renderLabel('Demanda Ultrap. (KW)')}
              <input type="number" step="any" name="demandaUltrKW" value={formData.detalhesDistribuidora?.demandaUltrKW || ''} onChange={handleDetailsChange} className={commonInputClass} />
            </div>
            <div>
              {renderLabel('Valor Demanda Ultrap. (R$)')}
              <input type="number" step="0.01" name="demandaUltrValor" value={formData.detalhesDistribuidora?.demandaUltrValor || ''} onChange={handleDetailsChange} className={commonInputClass} />
            </div>
           </div>
        </div>
      )}

      <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
        <button type="button" onClick={onCancel} className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
          {loading ? 'Salvando...' : 'Salvar Despesa'}
        </button>
      </div>
    </form>
  );
};

export default ExpenseForm;