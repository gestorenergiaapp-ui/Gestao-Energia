import React, { useState, useEffect, useCallback } from 'react';
import ContentCard from '@/components/shared/ContentCard';
import { api } from '@/services/api';
import type { Competence, CompetenceFormData } from '@/types';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const CompetenceManagement: React.FC = () => {
    const [competences, setCompetences] = useState<Competence[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCompetence, setNewCompetence] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const reloadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getCompetences();
            setCompetences(data.sort((a, b) => b.ano - a.ano || b.mes - a.mes));
        } catch (error) {
            toast.error("Falha ao carregar competências.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reloadData();
    }, [reloadData]);

    const handleAddCompetence = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCompetence) {
            toast.error('Por favor, selecione um mês e ano.');
            return;
        }

        setIsSubmitting(true);
        const [year, month] = newCompetence.split('-');
        const data: CompetenceFormData = {
            ano: parseInt(year, 10),
            mes: parseInt(month, 10),
        };

        try {
            await api.createCompetence(data);
            toast.success('Competência adicionada com sucesso!');
            setNewCompetence('');
            reloadData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Falha ao adicionar competência.';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (competenceId: string) => {
        if(window.confirm('Tem certeza que deseja excluir esta competência? A exclusão só será possível se não houver despesas associadas.')) {
            const deletePromise = api.deleteCompetence(competenceId);
            toast.promise(deletePromise, {
                loading: 'Excluindo competência...',
                success: 'Competência excluída com sucesso!',
                error: (err: any) => `Falha ao excluir: ${err?.message || 'Erro desconhecido.'}`
            });
            try {
                await deletePromise;
                reloadData();
            } catch (error) {
                 console.error("Failed to delete competence", error);
            }
        }
    };

    return (
        <ContentCard title="Gerenciar Competências" className="p-0">
            <form onSubmit={handleAddCompetence} className="p-4 border-b border-gray-700/50 flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="w-full sm:w-auto flex-grow">
                    <label htmlFor="competence-input" className="block text-sm font-medium text-gray-300 mb-1">
                        Adicionar Nova Competência
                    </label>
                    <input
                        id="competence-input"
                        type="month"
                        value={newCompetence}
                        onChange={(e) => setNewCompetence(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                    />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                    <PlusIcon className="h-5 w-5" />
                    {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                </button>
            </form>
             <div className="p-4">
                {/* Desktop Table */}
                <div className="hidden md:block">
                    <table className="min-w-full">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Competência (Mês/Ano)</th>
                                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-semibold text-white">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-900 divide-y divide-gray-800">
                            {loading ? (
                                <tr><td colSpan={2} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                            ) : competences.length > 0 ? (
                                competences.map(comp => (
                                    <tr key={comp._id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">
                                            {String(comp.mes).padStart(2, '0')}/{comp.ano}
                                        </td>
                                        <td className="whitespace-nowrap py-4 text-sm font-medium text-right sm:pr-6">
                                            <button onClick={() => handleDelete(comp._id)} title="Excluir" className="text-red-500 hover:text-red-400">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={2} className="text-center py-8 text-gray-400">Nenhuma competência cadastrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                 {/* Mobile Cards */}
                 <div className="block md:hidden space-y-4">
                    {loading ? (
                        <p className="text-center py-8 text-gray-400">Carregando...</p>
                    ) : competences.length > 0 ? (
                        competences.map(comp => (
                            <div key={comp._id} className="bg-gray-800/50 p-4 rounded-lg shadow-md flex justify-between items-center">
                                <p className="font-bold text-white">{String(comp.mes).padStart(2, '0')}/{comp.ano}</p>
                                <button onClick={() => handleDelete(comp._id)} title="Excluir" className="text-red-500 hover:text-red-400">
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center py-8 text-gray-400">Nenhuma competência cadastrada.</p>
                    )}
                 </div>
            </div>
        </ContentCard>
    );
};

export default CompetenceManagement;