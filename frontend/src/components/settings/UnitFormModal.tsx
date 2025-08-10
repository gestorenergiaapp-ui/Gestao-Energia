import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import type { Unit, UnitFormData, Contract } from '../../types';
import { MarketType } from '../../types';
import { api } from '../../services/api';
import { MARKET_TYPE_OPTIONS } from '../../constants';
import toast from 'react-hot-toast';

interface UnitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  unitToEdit: Unit | null;
  contracts: Contract[];
}

const initialFormData: UnitFormData = {
    nome: '',
    contratoId: '',
    marketType: MarketType.LIVRE,
};

const UnitFormModal: React.FC<UnitFormModalProps> = ({ isOpen, onClose, onSave, unitToEdit, contracts }) => {
  const [formData, setFormData] = useState<UnitFormData>(initialFormData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (unitToEdit) {
      setFormData({
        nome: unitToEdit.nome,
        contratoId: unitToEdit.contratoId,
        marketType: unitToEdit.marketType,
      });
    } else {
      setFormData(initialFormData);
    }
  }, [unitToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.nome || !formData.contratoId) {
        toast.error('Por favor, preencha todos os campos.');
        setLoading(false);
        return;
    }

    try {
        if (unitToEdit) {
            await api.updateUnit(unitToEdit._id, formData);
        } else {
            await api.createUnit(formData);
        }
        onSave();
    } catch(err: unknown) {
        const message = err instanceof Error ? err.message : 'Falha ao salvar a unidade.';
        toast.error(message);
    } finally {
        setLoading(false);
    }
  };
  
  const commonInputClass = "mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2";
  const commonLabelClass = "block text-sm font-medium text-gray-300";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={unitToEdit ? 'Editar Unidade' : 'Adicionar Nova Unidade'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <label htmlFor="nome" className={commonLabelClass}>Nome da Unidade</label>
            <input type="text" name="nome" id="nome" value={formData.nome} onChange={handleChange} className={commonInputClass} required/>
        </div>
         <div>
            <label htmlFor="contratoId" className={commonLabelClass}>Contrato</label>
            <select name="contratoId" id="contratoId" value={formData.contratoId} onChange={handleChange} className={commonInputClass} required>
                <option value="">Selecione um contrato</option>
                {contracts.map(c => <option key={c._id} value={c._id}>{c.nome}</option>)}
            </select>
        </div>
        <div>
            <label htmlFor="marketType" className={commonLabelClass}>Tipo de Mercado</label>
            <select name="marketType" id="marketType" value={formData.marketType} onChange={handleChange} className={commonInputClass} required>
                 {MARKET_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
        
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
            {loading ? 'Salvando...' : 'Salvar Unidade'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UnitFormModal;