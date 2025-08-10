import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { AuditLog, PaginatedAuditLogs } from '../../types';
import ContentCard from '../shared/ContentCard';

const getActionBadge = (action: string) => {
    const baseClass = 'px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full';
    switch (action.toUpperCase()) {
        case 'CREATE': return `${baseClass} bg-green-500/20 text-green-300`;
        case 'UPDATE': return `${baseClass} bg-blue-500/20 text-blue-300`;
        case 'DELETE': return `${baseClass} bg-red-500/20 text-red-300`;
        case 'LOGIN': return `${baseClass} bg-purple-500/20 text-purple-300`;
        default: return `${baseClass} bg-gray-500/20 text-gray-300`;
    }
};

const AuditLogScreen: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const data: PaginatedAuditLogs = await api.getAuditLogs({ page, limit: 15 });
                setLogs(data.logs);
                setTotalPages(data.totalPages);
                setError(null);
            } catch (err: any) {
                setError(err.message || "Falha ao carregar os logs.");
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [page]);

    return (
        <ContentCard title="Log de Alterações do Sistema" className="p-0">
            <div className="p-4">
                 {/* Desktop Table */}
                 <div className="hidden md:block">
                    <table className="min-w-full">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6 w-1/5">Data/Hora</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-white w-1/6">Usuário</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-white w-1/12">Ação</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">Descrição</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-900 divide-y divide-gray-800">
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Carregando logs...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={4} className="text-center py-8 text-red-400">{error}</td></tr>
                            ) : logs.length > 0 ? (
                                logs.map(log => (
                                    <tr key={log._id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-300 sm:pl-6">
                                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-white">{log.userName}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                            <span className={getActionBadge(log.action)}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-3 py-4 text-sm text-gray-300">{log.description}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhum log encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                 </div>

                 {/* Mobile Cards */}
                 <div className="block md:hidden space-y-4">
                    {loading ? (
                        <p className="text-center py-8 text-gray-400">Carregando logs...</p>
                    ) : error ? (
                        <p className="text-center py-8 text-red-400">{error}</p>
                    ) : logs.length > 0 ? (
                        logs.map(log => (
                            <div key={log._id} className="bg-gray-800/50 p-4 rounded-lg shadow-md">
                                <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-700/50">
                                    <div>
                                        <p className="font-semibold text-white">{log.userName}</p>
                                        <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <span className={getActionBadge(log.action)}>{log.action}</span>
                                </div>
                                <p className="text-sm text-gray-300">{log.description}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-center py-8 text-gray-400">Nenhum log encontrado.</p>
                    )}
                 </div>
            </div>
             <div className="flex items-center justify-between border-t border-gray-700 bg-gray-800 px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                    <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="relative inline-flex items-center rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-50">Anterior</button>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="relative ml-3 inline-flex items-center rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-50">Próxima</button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-400">
                            Página <span className="font-medium">{page}</span> de <span className="font-medium">{totalPages}</span>
                        </p>
                    </div>
                    <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-600 hover:bg-gray-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                                <span className="sr-only">Anterior</span>
                                &lt;
                            </button>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-600 hover:bg-gray-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                                <span className="sr-only">Próxima</span>
                                &gt;
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </ContentCard>
    );
};

export default AuditLogScreen;