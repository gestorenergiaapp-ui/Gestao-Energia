import React, { useState, useEffect, useCallback } from 'react';
import ContentCard from '@/components/shared/ContentCard';
import { api } from '@/services/api';
import type { Contract } from '@/types';
import ContractFormModal from './ContractFormModal';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ContractManagement: React.FC = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);

    const reloadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getContracts();
            setContracts(data);
        } catch(error) {
            toast.error('Falha ao carregar contratos.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reloadData();
    }, [reloadData]);

    const handleOpenModal = (contract: Contract | null = null) => {
        setEditingContract(contract);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingContract(null);
    };

    const handleSaveSuccess = () => {
        toast.success(`Contrato ${editingContract ? 'atualizado' : 'criado'} com sucesso!`);
        handleCloseModal();
        reloadData();
    };

    const handleDelete = async (contractId: string) => {
        if(window.confirm('Tem certeza que deseja excluir este contrato? As unidades associadas podem ficar sem contrato.')) {
            const deletePromise = api.deleteContract(contractId);
            toast.promise(deletePromise, {
                loading: 'Excluindo contrato...',
                success: 'Contrato excluído com sucesso!',
                error: (err: any) => `Falha ao excluir: ${err?.message || 'Erro desconhecido.'}`
            });

            try {
                await deletePromise;
                reloadData();
            } catch (error) {
                console.error("Failed to delete contract", error);
            }
        }
    };

    return (
        <>
            <ContentCard title="Gerenciar Contratos" className="p-0">
                <div className="flex justify-end p-4 border-b border-gray-700/50">
                    <button onClick={() => handleOpenModal()} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                        <PlusIcon className="h-5 w-5" />
                        Adicionar Contrato
                    </button>
                </div>
                 <div className="p-4">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <table className="min-w-full">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Nome do Contrato</th>
                                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-semibold text-white">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-900 divide-y divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan={2} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                                ) : contracts.length > 0 ? (
                                    contracts.map(contract => (
                                        <tr key={contract._id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{contract.nome}</td>
                                            <td className="whitespace-nowrap py-4 text-sm font-medium text-right sm:pr-6">
                                                <div className="flex justify-end items-center gap-4">
                                                    <button onClick={() => handleOpenModal(contract)} title="Editar" className="text-indigo-400 hover:text-indigo-300">
                                                        <PencilSquareIcon className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(contract._id)} title="Excluir" className="text-red-500 hover:text-red-400">
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={2} className="text-center py-8 text-gray-400">Nenhum contrato cadastrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                     {/* Mobile Cards */}
                     <div className="block md:hidden space-y-4">
                          {loading ? (
                            <p className="text-center py-8 text-gray-400">Carregando...</p>
                         ) : contracts.length > 0 ? (
                            contracts.map(contract => (
                                <div key={contract._id} className="bg-gray-800/50 p-4 rounded-lg shadow-md flex justify-between items-center">
                                    <p className="font-bold text-white">{contract.nome}</p>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => handleOpenModal(contract)} title="Editar" className="text-indigo-400 hover:text-indigo-300"><PencilSquareIcon className="h-5 w-5" /></button>
                                        <button onClick={() => handleDelete(contract._id)} title="Excluir" className="text-red-500 hover:text-red-400"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-8 text-gray-400">Nenhum contrato cadastrado.</p>
                        )}
                     </div>
                </div>
            </ContentCard>

            <ContractFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveSuccess}
                contractToEdit={editingContract}
            />
        </>
    );
};

export default ContractManagement;