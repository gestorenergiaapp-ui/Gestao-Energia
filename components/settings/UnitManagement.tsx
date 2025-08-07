import React, { useState, useEffect, useCallback } from 'react';
import ContentCard from '../shared/ContentCard';
import { api } from '../../services/api';
import type { Unit, Contract } from '../../types';
import UnitFormModal from './UnitFormModal';

const UnitManagement: React.FC = () => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [unitsData, contractsData] = await Promise.all([
                api.getAllUnits(),
                api.getContracts(),
            ]);
            setUnits(unitsData);
            setContracts(contractsData);
        } catch (error) {
            console.error("Failed to load units or contracts", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenModal = (unit: Unit | null = null) => {
        setEditingUnit(unit);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUnit(null);
    };

    const handleSaveSuccess = () => {
        handleCloseModal();
        loadData();
    };

    const handleDelete = async (unitId: string) => {
        if(window.confirm('Tem certeza que deseja excluir esta unidade? Todas as despesas associadas também serão removidas.')) {
            try {
                await api.deleteUnit(unitId);
                // Directly update the state to reflect the deletion in the UI immediately.
                setUnits(prevUnits => prevUnits.filter(u => u._id !== unitId));
            } catch(error) {
                console.error("Failed to delete unit", error);
                alert("Falha ao excluir unidade.");
            }
        }
    };
    
    const getContractName = (contractId: string) => {
        return contracts.find(c => c._id === contractId)?.nome || 'N/A';
    }

    return (
        <>
            <ContentCard title="Gerenciar Unidades" className="p-0">
                <div className="flex justify-end p-4">
                    <button onClick={() => handleOpenModal()} className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                        Adicionar Unidade
                    </button>
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Nome da Unidade</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">Contrato</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">Tipo de Mercado</th>
                                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                    <span className="sr-only">Ações</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 bg-gray-900">
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-4 text-gray-400">Carregando...</td></tr>
                            ) : (
                                units.map(unit => (
                                    <tr key={unit._id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{unit.nome}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{getContractName(unit.contratoId)}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 capitalize">{unit.marketType}</td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-4">
                                            <button onClick={() => handleOpenModal(unit)} className="text-indigo-400 hover:text-indigo-300">Editar</button>
                                            <button onClick={() => handleDelete(unit._id)} className="text-red-500 hover:text-red-400">Excluir</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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