import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../shared/Modal';
import { api } from '../../services/api';
import type { User, Unit } from '../../types';
import toast from 'react-hot-toast';

interface UserUnitsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    user: User;
    allUnits: Unit[];
}

const UserUnitsModal: React.FC<UserUnitsModalProps> = ({ isOpen, onClose, onSave, user, allUnits }) => {
    const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            setSelectedUnitIds(new Set(user.accessibleUnitIds || []));
            setSearchTerm('');
        }
    }, [isOpen, user]);

    const filteredUnits = useMemo(() => {
        if (!searchTerm) return allUnits;
        return allUnits.filter(unit => 
            unit.nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allUnits, searchTerm]);

    const handleToggleUnit = (unitId: string) => {
        setSelectedUnitIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitId)) {
                newSet.delete(unitId);
            } else {
                newSet.add(unitId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        const allFilteredIds = new Set(filteredUnits.map(u => u._id));
        setSelectedUnitIds(allFilteredIds);
    };

    const handleDeselectAll = () => {
        setSelectedUnitIds(new Set());
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.updateUserUnits(user._id, Array.from(selectedUnitIds));
            toast.success("Permissões salvas com sucesso!");
            onSave();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Falha ao salvar permissões.";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gerenciar Unidades de ${user.name}`}>
            <div className="space-y-4">
                <input
                    type="text"
                    placeholder="Buscar unidades..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                />

                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-400">{selectedUnitIds.size} de {allUnits.length} unidades selecionadas</p>
                    <div className="space-x-2">
                        <button onClick={handleSelectAll} className="text-xs text-indigo-400 hover:underline">Selecionar Todas</button>
                        <button onClick={handleDeselectAll} className="text-xs text-gray-400 hover:underline">Limpar Seleção</button>
                    </div>
                </div>

                <div className="max-h-80 overflow-y-auto border border-gray-700 rounded-lg p-2 space-y-2 bg-gray-900/50">
                    {filteredUnits.length > 0 ? filteredUnits.map(unit => (
                        <div key={unit._id} className="flex items-center p-2 rounded-md hover:bg-gray-700/50">
                            <input
                                type="checkbox"
                                id={`unit-${unit._id}`}
                                checked={selectedUnitIds.has(unit._id)}
                                onChange={() => handleToggleUnit(unit._id)}
                                className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor={`unit-${unit._id}`} className="ml-3 block text-sm font-medium text-gray-300">
                                {unit.nome}
                            </label>
                        </div>
                    )) : (
                        <p className="text-center text-gray-400 py-4">Nenhuma unidade encontrada.</p>
                    )}
                </div>
                
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                    <button type="button" onClick={onClose} className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={loading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                        {loading ? 'Salvando...' : 'Salvar Permissões'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default UserUnitsModal;