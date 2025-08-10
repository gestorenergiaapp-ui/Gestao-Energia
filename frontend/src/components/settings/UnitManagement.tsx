import React, { useState } from 'react';
import ContentCard from '../shared/ContentCard';
import { api } from '../../services/api';
import type { Unit, Contract } from '../../types';
import UnitFormModal from './UnitFormModal';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface UnitManagementProps {
    units: Unit[];
    contracts: Contract[];
    reloadData: () => void;
    loading: boolean;
}

const UnitManagement: React.FC<UnitManagementProps> = ({ units, contracts, reloadData, loading }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

    const handleOpenModal = (unit: Unit | null = null) => {
        setEditingUnit(unit);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUnit(null);
    };

    const handleSaveSuccess = () => {
        toast.success(`Unidade ${editingUnit ? 'atualizada' : 'criada'} com sucesso!`);
        handleCloseModal();
        reloadData();
    };

    const handleDelete = async (unitId: string) => {
        if(window.confirm('Tem certeza que deseja excluir esta unidade? Todas as despesas associadas também serão removidas.')) {
            const deletePromise = api.deleteUnit(unitId);
            toast.promise(deletePromise, {
                loading: 'Excluindo unidade...',
                success: 'Unidade excluída com sucesso!',
                error: (err: any) => `Falha ao excluir: ${err?.message || 'Erro desconhecido.'}`
            });
            try {
                await deletePromise;
                reloadData();
            } catch (error) {
                console.error("Failed to delete unit", error);
            }
        }
    };
    
    const getContractName = (contractId: string) => {
        return contracts.find(c => c._id === contractId)?.nome || 'N/A';
    }

    return (
        <>
            <ContentCard title="Gerenciar Unidades" className="p-0">
                <div className="flex justify-end p-4 border-b border-gray-700/50">
                    <button onClick={() => handleOpenModal()} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                        <PlusIcon className="h-5 w-5" />
                        Adicionar Unidade
                    </button>
                </div>
                 <div className="p-4">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <table className="min-w-full">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Nome da Unidade</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">Contrato</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">Tipo de Mercado</th>
                                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-semibold text-white">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-900 divide-y divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                                ) : units.length > 0 ? (
                                    units.map(unit => (
                                        <tr key={unit._id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{unit.nome}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{getContractName(unit.contratoId)}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 capitalize">{unit.marketType}</td>
                                            <td className="whitespace-nowrap py-4 text-sm font-medium text-right sm:pr-6">
                                                <div className="flex justify-end items-center gap-4">
                                                    <button onClick={() => handleOpenModal(unit)} title="Editar" className="text-indigo-400 hover:text-indigo-300">
                                                        <PencilSquareIcon className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(unit._id)} title="Excluir" className="text-red-500 hover:text-red-400">
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhuma unidade cadastrada.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Cards */}
                    <div className="block md:hidden space-y-4">
                         {loading ? (
                            <p className="text-center py-8 text-gray-400">Carregando...</p>
                         ) : units.length > 0 ? (
                            units.map(unit => (
                                <div key={unit._id} className="bg-gray-800/50 p-4 rounded-lg shadow-md">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-white text-lg">{unit.nome}</p>
                                        <div className="flex justify-end items-center gap-4">
                                            <button onClick={() => handleOpenModal(unit)} title="Editar" className="text-indigo-400 hover:text-indigo-300"><PencilSquareIcon className="h-5 w-5" /></button>
                                            <button onClick={() => handleDelete(unit._id)} title="Excluir" className="text-red-500 hover:text-red-400"><TrashIcon className="h-5 w-5" /></button>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-sm space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Contrato:</span>
                                            <span className="text-gray-200">{getContractName(unit.contratoId)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Mercado:</span>
                                            <span className="text-gray-200 capitalize">{unit.marketType}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-8 text-gray-400">Nenhuma unidade cadastrada.</p>
                        )}
                    </div>
                </div>
            </ContentCard>

            <UnitFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveSuccess}
                unitToEdit={editingUnit}
                contracts={contracts}
            />
        </>
    );
};

export default UnitManagement;