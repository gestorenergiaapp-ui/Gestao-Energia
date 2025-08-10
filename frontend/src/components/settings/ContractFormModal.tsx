import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../shared/Modal';
import type { Contract, ContractFormData } from '../../types';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { useForm } from '../../hooks/useForm';

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  contractToEdit: Contract | null;
}

const initialFormData: ContractFormData = {
    nome: '',
};

const ContractFormModal: React.FC<ContractFormModalProps> = ({ isOpen, onClose, onSave, contractToEdit }) => {
  const [loading, setLoading] = useState(false);
  
  const initialFormState = useMemo(() => {
    return contractToEdit ? { nome: contractToEdit.nome } : initialFormData;
  }, [contractToEdit]);

  const { formData, handleChange } = useForm(initialFormState);

  useEffect(() => {
    if (!isOpen) {
        setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.nome.trim()) {
        toast.error('Por favor, preencha o nome do contrato.');
        setLoading(false);
        return;
    }

    try {
        if (contractToEdit) {
            await api.updateContract(contractToEdit._id, formData);
        } else {
            await api.createContract(formData);
        }
        onSave();
    } catch(err: unknown) {
        const message = err instanceof Error ? err.message : 'Falha ao salvar o contrato.';
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
      title={contractToEdit ? 'Editar Contrato' : 'Adicionar Novo Contrato'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <label htmlFor="nome" className={commonLabelClass}>Nome do Contrato</label>
            <input type="text" name="nome" id="nome" value={formData.nome} onChange={handleChange} className={commonInputClass} required/>
        </div>
        
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
            {loading ? 'Salvando...' : 'Salvar Contrato'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ContractFormModal;