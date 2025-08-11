import React, { useState } from 'react';
import type { Expense, Unit, Competence, User, GroupedExpense } from '@/types';
import { SUBTYPE_ENCARGO_OPTIONS } from '@/constants';
import { MarketType } from '@/types';
import { ChevronRightIcon, EyeIcon, EyeSlashIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ExpensesTableProps {
  groupedData: GroupedExpense[];
  units: Unit[];
  competences: Competence[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  userRole: User['role'];
}

const ExpensesTable: React.FC<ExpensesTableProps> = ({ groupedData, units, competences, onEdit, onDelete, userRole }) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [visibleCodes, setVisibleCodes] = useState<string[]>([]);

  const getUnit = (id: string) => units.find(u => u._id === id);
  
  const getCompetenceName = (id: string) => {
    const comp = competences.find(c => c._id === id);
    return comp ? `${String(comp.mes).padStart(2, '0')}/${comp.ano}` : 'N/A';
  };
  
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', {timeZone: 'UTC'});

  const handleToggleRow = (groupKey: string) => {
    setExpandedRows(prev =>
        prev.includes(groupKey)
            ? prev.filter(key => key !== groupKey)
            : [...prev, groupKey]
    );
  };
  
  const toggleCodeVisibility = (expenseId: string) => {
    setVisibleCodes(prev => 
        prev.includes(expenseId)
            ? prev.filter(id => id !== expenseId)
            : [...prev, expenseId]
    );
  };
  
  const marketType = getUnit(groupedData[0]?.unidadeId)?.marketType;
  const canManage = userRole === 'admin' || userRole === 'gestor';
  const canViewCode = userRole === 'admin' || userRole === 'gestor';

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6 w-1/4">Unidade</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Competência</th>
              <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-white">Custo Real</th>
              {marketType === MarketType.LIVRE && (
                <>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-white">Custo Estimado (Cativo)</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-white">Economia</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-900">
            {groupedData.length > 0 ? groupedData.map((group) => {
              const unit = getUnit(group.unidadeId);
              const isExpanded = expandedRows.includes(group.groupKey);
              const economia = group.totalEstimado != null ? group.totalEstimado - group.totalReal : null;

              return (
              <React.Fragment key={group.groupKey}>
                <tr className="hover:bg-gray-800/50 cursor-pointer" onClick={() => handleToggleRow(group.groupKey)}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">
                     <div className="flex items-center">
                       <ChevronRightIcon className={`h-5 w-5 mr-1 transition-transform text-gray-400 ${isExpanded ? 'rotate-90' : ''}`} />
                       <span>{unit?.nome || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{getCompetenceName(group.competenciaId)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 text-right">{formatCurrency(group.totalReal)}</td>
                  {marketType === MarketType.LIVRE && (
                    <>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 text-right">{formatCurrency(group.totalEstimado)}</td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm font-semibold text-right ${economia != null && economia >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(economia)}</td>
                    </>
                  )}
                </tr>
                {isExpanded && (
                   <tr className="bg-gray-800/20">
                    <td colSpan={marketType === MarketType.LIVRE ? 5 : 3} className="p-0">
                        <div className="p-4 bg-gray-800/50">
                            <h4 className="text-md font-semibold text-indigo-300 mb-3">Contas Detalhadas</h4>
                            {/* Desktop Table View */}
                             <div className="hidden md:block">
                                 <table className="min-w-full">
                                    <thead className="bg-gray-700/50">
                                         <tr>
                                            <th className="py-2 px-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Tipo</th>
                                            <th className="py-2 px-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Subtipo</th>
                                            <th className="py-2 px-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Código</th>
                                            <th className="py-2 px-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Valor (R$)</th>
                                            <th className="py-2 px-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Vencimento</th>
                                            <th className="py-2 px-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Consumo (MWh)</th>
                                            <th className="py-2 px-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Multa Reativo (R$)</th>
                                            <th className="py-2 px-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Multa Demanda (R$)</th>
                                            {canManage && <th className="py-2 px-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">Ações</th>}
                                         </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {group.expenses.map(expense => (
                                            <tr key={expense._id}>
                                                <td className="p-3 text-sm text-gray-300 capitalize">{expense.tipoDespesa.replace('_', ' ')}</td>
                                                <td className="p-3 text-sm text-gray-300">{SUBTYPE_ENCARGO_OPTIONS.find(o => o.value === expense.subtipoEncargo)?.label || '-'}</td>
                                                <td className="p-3 text-sm text-gray-300 font-mono">
                                                     {expense.codigoLancamento ? (
                                                        canViewCode ? (
                                                            <div className="flex items-center justify-start gap-2">
                                                                <span>
                                                                    {visibleCodes.includes(expense._id) ? expense.codigoLancamento : '••••••'}
                                                                </span>
                                                                <button onClick={() => toggleCodeVisibility(expense._id)} className="text-gray-400 hover:text-white focus:outline-none" title="Mostrar/Ocultar Código">
                                                                    {visibleCodes.includes(expense._id) ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                                </button>
                                                            </div>
                                                        ) : ( <span>Oculto</span> )
                                                     ) : '-'}
                                                </td>
                                                <td className="p-3 text-sm text-gray-300 text-right">{formatCurrency(expense.valor)}</td>
                                                <td className="p-3 text-sm text-gray-300">{formatDate(expense.vencimento)}</td>
                                                <td className="p-3 text-sm text-gray-300 text-right">{expense.detalhesDistribuidora ? expense.detalhesDistribuidora.consumoMWh.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '-'}</td>
                                                <td className="p-3 text-sm text-gray-300 text-right">{expense.detalhesDistribuidora ? formatCurrency(expense.detalhesDistribuidora.reativoValor) : '-'}</td>
                                                <td className="p-3 text-sm text-gray-300 text-right">{expense.detalhesDistribuidora ? formatCurrency(expense.detalhesDistribuidora.demandaUltrValor) : '-'}</td>
                                                {canManage && (
                                                    <td className="p-3 text-sm font-medium text-center space-x-3">
                                                        <button onClick={() => onEdit(expense)} title="Editar" className="text-indigo-400 hover:text-indigo-300 inline-block"><PencilSquareIcon className="h-5 w-5"/></button>
                                                        <button onClick={() => onDelete(expense._id)} title="Excluir" className="text-red-500 hover:text-red-400 inline-block"><TrashIcon className="h-5 w-5"/></button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                 </table>
                             </div>
                            {/* Mobile Card View */}
                             <div className="block md:hidden space-y-4">
                                {group.expenses.map(expense => {
                                    const d = expense.detalhesDistribuidora;
                                    const isCodeVisible = visibleCodes.includes(expense._id);
                                    return (
                                        <div key={expense._id} className="bg-gray-700/50 p-3 rounded-lg shadow">
                                            <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-600/50">
                                                <div>
                                                    <p className="font-bold text-white capitalize">{expense.tipoDespesa.replace('_', ' ')}</p>
                                                    {expense.subtipoEncargo && (
                                                        <p className="text-xs text-gray-400 -mt-1">
                                                            {SUBTYPE_ENCARGO_OPTIONS.find(o => o.value === expense.subtipoEncargo)?.label || '-'}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="font-bold text-lg text-indigo-300">{formatCurrency(expense.valor)}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                                                <span className="text-gray-400">Vencimento:</span>
                                                <span className="text-gray-200 text-right">{formatDate(expense.vencimento)}</span>
                                                
                                                <span className="text-gray-400">Código:</span>
                                                <div className="text-gray-200 font-mono flex items-center justify-end gap-2 text-right">
                                                    {expense.codigoLancamento ? ( canViewCode ? (
                                                        <>
                                                            <span className={isCodeVisible ? '' : 'tracking-widest'}>{isCodeVisible ? expense.codigoLancamento : '••••••'}</span>
                                                            <button onClick={() => toggleCodeVisibility(expense._id)} className="text-gray-400 hover:text-white"><EyeIcon className="h-4 w-4"/></button>
                                                        </>
                                                    ) : (<span>Oculto</span>) ) : (<span>-</span>)}
                                                </div>
                                                
                                                {d && (
                                                    <>
                                                        <span className="col-span-2 text-gray-400 border-t border-gray-600/50 mt-1 pt-1 font-semibold">Detalhes</span>
                                                        <span className="text-gray-400">Consumo:</span>
                                                        <span className="text-gray-200 text-right">{d.consumoMWh.toLocaleString('pt-BR')} MWh</span>
                                                        
                                                        <span className="text-gray-400">Multa Reativo:</span>
                                                        <span className="text-gray-200 text-right">{formatCurrency(d.reativoValor)}</span>
                                                        
                                                        <span className="text-gray-400">Multa Demanda:</span>
                                                        <span className="text-gray-200 text-right">{formatCurrency(d.demandaUltrValor)}</span>
                                                    </>
                                                )}
                                            </div>
                                            
                                            {canManage && (
                                                <div className="flex justify-end gap-4 mt-3 pt-2 border-t border-gray-600/50">
                                                    <button onClick={() => onEdit(expense)} title="Editar" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-sm"><PencilSquareIcon className="h-5 w-5"/> Editar</button>
                                                    <button onClick={() => onDelete(expense._id)} title="Excluir" className="text-red-500 hover:text-red-400 flex items-center gap-1 text-sm"><TrashIcon className="h-5 w-5"/> Excluir</button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                             </div>
                        </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )}) : (
              <tr>
                <td colSpan={marketType === MarketType.LIVRE ? 5 : 3} className="text-center py-8 text-gray-400">Nenhuma despesa encontrada para os filtros selecionados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpensesTable;