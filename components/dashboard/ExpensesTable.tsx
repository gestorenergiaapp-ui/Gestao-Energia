import React, { useState, useMemo } from 'react';
import type { Expense, Unit, Competence, SummaryData } from '../../types';
import { SUBTYPE_ENCARGO_OPTIONS } from '../../constants';
import { MarketType, ExpenseType } from '../../types';

interface ExpensesTableProps {
  expenses: Expense[];
  units: Unit[];
  competences: Competence[];
  summaryData: SummaryData;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

interface GroupedExpense {
    groupKey: string;
    unidadeId: string;
    competenciaId: string;
    expenses: Expense[];
    totalReal: number;
    totalEstimado: number | null;
}

const getEffectiveCompetenceId = (expense: Expense, allCompetences: Competence[]): string => {
    if (expense.tipoDespesa !== ExpenseType.ENCARGO) {
        return expense.competenciaId;
    }
    const vencimento = new Date(expense.vencimento);
    const vencimentoMes = vencimento.getUTCMonth() + 1;
    const vencimentoAno = vencimento.getUTCFullYear();
    const matchingCompetence = allCompetences.find(c => c.ano === vencimentoAno && c.mes === vencimentoMes);
    // Fallback to original competence if no match is found (e.g., for future dates not in competence list)
    return matchingCompetence?._id || expense.competenciaId; 
};


const ExpensesTable: React.FC<ExpensesTableProps> = ({ expenses, units, competences, summaryData, onEdit, onDelete }) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
    setExpandedRow(prev => prev === groupKey ? null : groupKey);
  }

  const groupedExpenses = useMemo((): GroupedExpense[] => {
    const groups: Record<string, GroupedExpense> = {};

    expenses.forEach(expense => {
      const effectiveCompetenceId = getEffectiveCompetenceId(expense, competences);
      const groupKey = `${expense.unidadeId}-${effectiveCompetenceId}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          groupKey,
          unidadeId: expense.unidadeId,
          competenciaId: effectiveCompetenceId,
          expenses: [],
          totalReal: 0,
          totalEstimado: summaryData[expense.unidadeId]?.[effectiveCompetenceId]?.cativo ?? null
        };
      }
      groups[groupKey].expenses.push(expense);
    });

    return Object.values(groups).map(group => {
      group.totalReal = group.expenses.reduce((sum, exp) => sum + exp.valor, 0);
      // Sort expenses within the group for consistent display
      group.expenses.sort((a,b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
      return group;
    }).sort((a, b) => {
        const compA = competences.find(c => c._id === a.competenciaId);
        const compB = competences.find(c => c._id === b.competenciaId);
        if (!compA || !compB) return 0;
        return (compB.ano - compA.ano) || (compB.mes - compA.mes);
    });
  }, [expenses, summaryData, competences]);

  const marketType = getUnit(groupedExpenses[0]?.unidadeId)?.marketType;

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
            {groupedExpenses.length > 0 ? groupedExpenses.map((group) => {
              const unit = getUnit(group.unidadeId);
              const isExpanded = expandedRow === group.groupKey;
              const economia = group.totalEstimado ? group.totalEstimado - group.totalReal : null;

              return (
              <React.Fragment key={group.groupKey}>
                <tr className="hover:bg-gray-800/50 cursor-pointer" onClick={() => handleToggleRow(group.groupKey)}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">
                     <div className="flex items-center">
                       <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 transition-transform text-gray-400 ${isExpanded ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                       </svg>
                       <span>{unit?.nome || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{getCompetenceName(group.competenciaId)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 text-right">{formatCurrency(group.totalReal)}</td>
                  {marketType === MarketType.LIVRE && (
                    <>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 text-right">{formatCurrency(group.totalEstimado)}</td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm font-semibold text-right ${economia && economia > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(economia)}</td>
                    </>
                  )}
                </tr>
                {isExpanded && (
                   <tr className="bg-gray-800/20">
                    <td colSpan={marketType === MarketType.LIVRE ? 5 : 3} className="p-0">
                        <div className="p-4 bg-gray-800/50">
                            <h4 className="text-md font-semibold text-indigo-300 mb-3">Contas Detalhadas</h4>
                             <table className="min-w-full">
                                <thead className="bg-gray-700/50">
                                     <tr>
                                        <th className="py-2 px-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Tipo</th>
                                        <th className="py-2 px-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Subtipo</th>
                                        <th className="py-2 px-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Valor (R$)</th>
                                        <th className="py-2 px-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Vencimento</th>
                                        <th className="py-2 px-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Consumo (MWh)</th>
                                        <th className="py-2 px-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Multa Reativo (R$)</th>
                                        <th className="py-2 px-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Multa Demanda (R$)</th>
                                        <th className="py-2 px-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">Ações</th>
                                     </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/50">
                                    {group.expenses.map(expense => {
                                      const d = expense.detalhesDistribuidora;
                                      return (
                                        <tr key={expense._id} className="hover:bg-gray-700/50">
                                            <td className="px-3 py-3 text-sm text-gray-300 capitalize">{expense.tipoDespesa.replace('_', ' ')}</td>
                                            <td className="px-3 py-3 text-sm text-gray-300">{SUBTYPE_ENCARGO_OPTIONS.find(o => o.value === expense.subtipoEncargo)?.label || '-'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-300 text-right">{formatCurrency(expense.valor)}</td>
                                            <td className="px-3 py-3 text-sm text-gray-300">{formatDate(expense.vencimento)}</td>
                                            <td className="px-3 py-3 text-sm text-gray-300 text-right">{d ? d.consumoMWh.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '-'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-300 text-right">{d ? formatCurrency(d.reativoValor) : '-'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-300 text-right">{d ? formatCurrency(d.demandaUltrValor) : '-'}</td>
                                            <td className="px-3 py-3 text-sm font-medium space-x-3 text-center">
                                                <button onClick={() => onEdit(expense)} className="text-indigo-400 hover:text-indigo-300">Editar</button>
                                                <button onClick={() => onDelete(expense._id)} className="text-red-500 hover:text-red-400">Excluir</button>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                             </table>
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