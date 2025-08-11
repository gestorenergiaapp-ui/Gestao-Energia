import React, { useState, useMemo, useCallback } from 'react';
import { api } from '@/services/api';
import type { Unit, Competence, BarChartData, ChartData, Expense, Estimate, UnitDetailData, Contract, GroupedExpense } from '@/types';
import { MarketType, ExpenseType } from '@/types';
import KPI from './KPI';
import ChartCard from '@/components/shared/ChartCard';
import ExpensesBarChart from '@/components/charts/ExpensesBarChart';
import ExpensesPieChart from '@/components/charts/ExpensesPieChart';
import HorizontalRankChart from '@/components/charts/HorizontalRankChart';
import Modal from '@/components/shared/Modal';
import ExpenseForm from './ExpenseForm';
import ExpensesTable from './ExpensesTable';
import ContentCard from '@/components/shared/ContentCard';
import UnitDetailModal from './UnitDetailModal';
import MonthlyClosingModal from './MonthlyClosingModal';
import BreakdownModal from './BreakdownModal';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardModals } from '@/hooks/useDashboardModals';
import { 
    PlusIcon, 
    ArchiveBoxIcon, 
    ExclamationTriangleIcon,
    CurrencyDollarIcon,
    BanknotesIcon,
    BuildingOfficeIcon,
    CalendarDaysIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const MarketTypeButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            active 
            ? 'bg-indigo-600 text-white shadow-md' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
    >
        {children}
    </button>
);

const ITEMS_PER_PAGE = 5;

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    
    // --- Filters State ---
    const [selectedContract, setSelectedContract] = useState<string>('');
    const [selectedMarket, setSelectedMarket] = useState<MarketType>(MarketType.LIVRE);
    const [selectedUnit, setSelectedUnit] = useState<string>('');
    const [selectedCompetence, setSelectedCompetence] = useState<string>('');
    const [expensesPage, setExpensesPage] = useState(1);

    const filters = useMemo(() => ({
        contratoId: selectedContract,
        marketType: selectedMarket,
        unidadeId: selectedUnit,
        competenciaId: selectedCompetence,
    }), [selectedContract, selectedMarket, selectedUnit, selectedCompetence]);

    // --- Data Fetching Hook ---
    const {
        units,
        contracts,
        competences,
        estimates,
        expenses,
        loading,
        reloading,
        kpis,
        pieChartData,
        barChartData,
        unitChartData,
        marketChartData,
        opportunitiesChartData,
        totalsByGroup,
        loadDashboardData,
        reloadCompetences,
    } = useDashboardData(filters, selectedCompetence);
    
    // --- Modals State Hook ---
    const {
        isFormOpen, editingExpense, handleOpenForm, handleCloseForm, closeFormModal, setIsFormDirty,
        isUnitDetailModalOpen, selectedUnitDetails, openUnitDetailModal, closeUnitDetailModal,
        isClosingModalOpen, openClosingModal, closeClosingModal,
        isBreakdownModalOpen, breakdownModalProps, openBreakdownModal, closeBreakdownModal,
        isComparisonDetailModalOpen, comparisonDetailTitle, comparisonUnitDetails, openComparisonDetailModal, closeComparisonDetailModal,
    } = useDashboardModals();

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // --- Derived State and Memoized Calculations ---
    const filteredUnits = useMemo(() => {
        return units
            .filter(u => !selectedContract || u.contratoId === selectedContract)
            .filter(u => u.marketType === selectedMarket);
    }, [units, selectedContract, selectedMarket]);

    const noUnitsMatchMarket = useMemo(() => {
        if (!selectedContract) return false;
        const hasAnyUnitsForContract = units.some(u => u.contratoId === selectedContract);
        if (!hasAnyUnitsForContract) return false;
        const hasMatchingUnits = units.some(u => u.contratoId === selectedContract && u.marketType === selectedMarket);
        return hasAnyUnitsForContract && !hasMatchingUnits;
    }, [units, selectedContract, selectedMarket]);

    // --- Handlers ---
    const handleContractChange = (contractId: string) => {
        setSelectedContract(contractId);
        setSelectedUnit('');
        setSelectedCompetence('');
        setExpensesPage(1);
    };

    const handleMarketChange = (marketType: MarketType) => {
        setSelectedMarket(marketType);
        setSelectedUnit('');
        setSelectedCompetence('');
        setExpensesPage(1);
    };
    
    const handleUnitChange = (unitId: string) => {
        setSelectedUnit(unitId);
        setExpensesPage(1);
    }
    
    const handleCompetenceChange = (competenceId: string) => {
        setSelectedCompetence(competenceId);
        setExpensesPage(1);
    }

    const handleSaveSuccess = () => {
        closeFormModal();
        toast.success(`Lançamento ${editingExpense ? 'atualizado' : 'criado'} com sucesso!`);
        loadDashboardData();
        reloadCompetences();
    };

    const handleDelete = async (expenseId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta despesa?')) {
            const deletePromise = api.deleteExpense(expenseId);
            toast.promise(deletePromise, {
                loading: 'Excluindo despesa...',
                success: 'Despesa excluída com sucesso!',
                error: (err: any) => `Falha ao excluir: ${err?.message || 'Erro desconhecido.'}`
            });

            try {
                await deletePromise;
                loadDashboardData();
            } catch (error) {
                console.error("Failed to delete expense", error);
            }
        }
    };

    const handleUnitChartClick = async (payload: any) => {
        if (payload && payload.name) {
            openUnitDetailModal(payload.name, filters);
        }
    };

    const handleUnitBarClick = (data: any) => {
        if (data && data.payload) {
            handleUnitChartClick(data.payload);
        }
    };

    const handleOpportunityChartClick = (payload: any) => {
        if (!payload || !payload.name) return;

        const penaltyType = payload.name as string;
        const totalValue = payload.value as number;
        const results: { [key: string]: number } = {};

        const valueField = penaltyType.includes('Reativo') ? 'reativoValor' : 'demandaUltrValor';

        expenses.forEach(expense => {
            if (expense.detalhesDistribuidora && (expense.detalhesDistribuidora as any)[valueField] > 0) {
                const unitName = units.find(u => u._id === expense.unidadeId)?.nome || 'Desconhecida';
                results[unitName] = (results[unitName] || 0) + (expense.detalhesDistribuidora as any)[valueField];
            }
        });

        const dataForModal = Object.entries(results)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        openBreakdownModal({
            title: `Detalhes: ${penaltyType}`,
            data: dataForModal,
            dataLabel: 'Unidade',
            valueLabel: 'Valor da Multa',
            totalValue: totalValue,
        });
    };

    const expenseBelongsToCompetence = (expense: Expense, competence: Competence) => {
        if (expense.tipoDespesa === ExpenseType.ENCARGO) {
            const vencimento = new Date(expense.vencimento);
            return vencimento.getUTCFullYear() === competence.ano && (vencimento.getUTCMonth() + 1) === competence.mes;
        }
        return expense.competenciaId === competence._id.toString();
    };

    const handleMonthlyBarClick = (data: any) => {
        const payload = data.payload;
        if (!payload || !payload.name) return;

        const monthName = payload.name as string; // "MM/YYYY"
        const totalValue = payload['Valor (R$)'] as number;
        const [mesStr, anoStr] = monthName.split('/');
        const mes = parseInt(mesStr, 10);
        const ano = parseInt(anoStr, 10);

        const targetComp = competences.find(c => c.ano === ano && c.mes === mes);
        if (!targetComp) return;

        const results: { [key: string]: number } = {};
        const expensesForMonth = expenses.filter(e => expenseBelongsToCompetence(e, targetComp));

        expensesForMonth.forEach(expense => {
            const unitName = units.find(u => u._id === expense.unidadeId)?.nome || 'Desconhecida';
            results[unitName] = (results[unitName] || 0) + expense.valor;
        });

        const dataForModal = Object.entries(results)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        
        openBreakdownModal({
            title: `Composição de Custo - ${monthName}`,
            data: dataForModal,
            dataLabel: 'Unidade',
            valueLabel: 'Custo Total',
            totalValue: totalValue,
        });
    };

     const handleMarketChartClick = (data: any) => {
        const unitName = data?.payload?.name;
        if (!unitName || !totalsByGroup) return;

        const unit = units.find(u => u.nome === unitName);
        if (!unit) return;
        
        const detailsForUnit = Object.entries(totalsByGroup)
            .filter(([key]) => key.startsWith(unit._id))
            .map(([key, value]) => {
                const typedValue = value as { real: number, estimado: number };
                const competenceId = key.split('-')[1];
                const comp = competences.find(c => c._id === competenceId);
                const compName = comp ? `${String(comp.mes).padStart(2,'0')}/${comp.ano}` : 'N/A';
                return {
                    name: compName,
                    'Custo Real': typedValue.real,
                    'Custo Estimado': typedValue.estimado,
                    ano: comp?.ano,
                    mes: comp?.mes,
                };
            })
            .filter(item => item['Custo Estimado'] > 0)
            .sort((a, b) => (a.ano ?? 0) - (b.ano ?? 0) || (a.mes ?? 0) - (b.mes ?? 0));

        openComparisonDetailModal(`Detalhe por Competência: ${unitName}`, detailsForUnit);
    };
    
    const getEffectiveCompetenceId = (expense: Expense, allCompetences: Competence[]): string => {
        if (expense.tipoDespesa !== ExpenseType.ENCARGO) {
            return expense.competenciaId;
        }
        const vencimento = new Date(expense.vencimento);
        const vencimentoMes = vencimento.getUTCMonth() + 1;
        const vencimentoAno = vencimento.getUTCFullYear();
        const matchingCompetence = allCompetences.find(c => c.ano === vencimentoAno && c.mes === vencimentoMes);
        return matchingCompetence?._id || expense.competenciaId; 
    };
    
    const paginatedExpenseGroups = useMemo(() => {
        const groups: Record<string, GroupedExpense> = {};
        expenses.forEach(expense => {
            const effectiveCompetenceId = getEffectiveCompetenceId(expense, competences);
            const groupKey = `${expense.unidadeId}-${effectiveCompetenceId}`;
            if (!groups[groupKey]) {
                const estimate = estimates.find(est => est.unidadeId === expense.unidadeId && est.competenciaId === effectiveCompetenceId);
                groups[groupKey] = { groupKey, unidadeId: expense.unidadeId, competenciaId: effectiveCompetenceId, expenses: [], totalReal: 0, totalEstimado: estimate ? estimate.valor : null };
            }
            groups[groupKey].expenses.push(expense);
        });

        const allGroups = Object.values(groups).map(group => {
            group.totalReal = group.expenses.reduce((sum, exp) => sum + exp.valor, 0);
            group.expenses.sort((a,b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
            return group;
        }).sort((a, b) => {
            const compA = competences.find(c => c._id === a.competenciaId);
            const compB = competences.find(c => c._id === b.competenciaId);
            if (!compA || !compB) return 0;
            return (compB.ano - compA.ano) || (compB.mes - compA.mes);
        });

        if (selectedCompetence) {
            return { paginatedGroups: allGroups, totalPages: 1 };
        }

        const totalPages = Math.ceil(allGroups.length / ITEMS_PER_PAGE);
        const startIndex = (expensesPage - 1) * ITEMS_PER_PAGE;
        const paginatedGroups = allGroups.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return { paginatedGroups, totalPages };
    }, [expenses, estimates, competences, expensesPage, selectedCompetence]);


    const unitsForForm = useMemo(() => {
        return units.filter(u => !selectedContract || u.contratoId === selectedContract);
    }, [units, selectedContract])

     if (loading) {
        return (
             <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        )
    }

    if (!loading && user?.role === 'user' && units.length === 0) {
        return (
            <div className="text-center py-10 px-4 sm:px-6 lg:px-8 bg-gray-800 rounded-lg">
                <InformationCircleIcon className="mx-auto h-12 w-12 text-sky-400" />
                <h3 className="mt-2 text-2xl font-semibold text-white">Bem-vindo(a)!</h3>
                <p className="mt-2 text-md text-gray-400">
                    Seu acesso está ativo, mas parece que você ainda não tem permissão para visualizar nenhuma unidade.
                </p>
                <p className="mt-1 text-md text-gray-400">
                    Por favor, entre em contato com um administrador para solicitar acesso às unidades que você gerencia.
                </p>
            </div>
        )
    }


    return (
        <div className="space-y-6">
             {/* Filters & Actions */}
             <div className="mb-6 rounded-lg bg-gray-800 p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full md:w-auto">
                       <div>
                            <label htmlFor="contract-filter" className="text-lg font-semibold text-white">Contrato</label>
                            <select
                                id="contract-filter"
                                value={selectedContract}
                                onChange={(e) => handleContractChange(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                            >
                                <option value="">Todos os Contratos</option>
                                {contracts.map(c => <option key={c._id} value={c._id}>{c.nome}</option>)}
                            </select>
                       </div>
                       <div>
                            <h2 className="text-lg font-semibold text-white">Modo de Análise</h2>
                            <div className="flex items-center space-x-2 p-1 bg-gray-900/50 rounded-lg mt-1">
                                <MarketTypeButton active={selectedMarket === MarketType.LIVRE} onClick={() => handleMarketChange(MarketType.LIVRE)}>
                                    Mercado Livre
                                </MarketTypeButton>
                                <MarketTypeButton active={selectedMarket === MarketType.CATIVO} onClick={() => handleMarketChange(MarketType.CATIVO)}>
                                    Mercado Cativo
                                </MarketTypeButton>
                            </div>
                       </div>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                       {user?.role !== 'user' && (
                           <>
                               <button onClick={() => handleOpenForm()} className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                                  <PlusIcon className="h-5 w-5" />
                                  Adicionar Lançamento
                               </button>
                               {selectedCompetence && (
                                   <button 
                                       onClick={openClosingModal} 
                                       className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                                   >
                                      <ArchiveBoxIcon className="h-5 w-5" />
                                      Fechar Mês / Gerar Relatório
                                   </button>
                               )}
                           </>
                       )}
                   </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                    <h3 className="text-md font-semibold text-white mb-2">Filtros Adicionais</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="unit-filter" className="block text-sm font-medium text-gray-300">Unidade</label>
                            <select
                                id="unit-filter"
                                value={selectedUnit}
                                onChange={(e) => handleUnitChange(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                            >
                                <option value="">Todas as Unidades</option>
                                {filteredUnits.map(unit => <option key={unit._id} value={unit._id}>{unit.nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="competence-filter" className="block text-sm font-medium text-gray-300">Competência</label>
                            <select
                                id="competence-filter"
                                value={selectedCompetence}
                                onChange={(e) => handleCompetenceChange(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                            >
                                <option value="">Todas as Competências</option>
                                {competences.map(c => {
                                    const baseLabel = `${String(c.mes).padStart(2, '0')}/${c.ano}`;
                                    return <option key={c._id} value={c._id}>{baseLabel}</option>
                                })}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {noUnitsMatchMarket && (
                <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg flex items-start gap-3" role="alert">
                    <div className="flex-shrink-0 pt-0.5">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                    </div>
                    <div>
                        <p className="font-bold text-yellow-300">Nenhuma unidade encontrada para esta combinação de filtros</p>
                        <p className="text-sm">
                            O contrato <strong>{contracts.find(c => c._id === selectedContract)?.nome || 'selecionado'}</strong> não possui unidades no <strong>Mercado {selectedMarket === MarketType.LIVRE ? 'Livre' : 'Cativo'}</strong>.
                        </p>
                    </div>
                </div>
            )}

            {reloading ? (
                <div className="flex justify-center items-center h-96">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* KPIs */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <KPI title="Total de Despesas" value={formatCurrency(kpis.totalDespesas)} icon={<CurrencyDollarIcon className="h-7 w-7"/>} />
                        {selectedMarket === MarketType.LIVRE && (
                            <KPI title="Economia vs. Cativo" value={formatCurrency(kpis.economia)} icon={<BanknotesIcon className="h-7 w-7"/>} />
                        )}
                        <KPI title="Unidades na Análise" value={selectedUnit ? '1' : `${filteredUnits.length}`} icon={<BuildingOfficeIcon className="h-7 w-7"/>} />
                        <KPI title="Competências na Análise" value={selectedCompetence ? '1' : 'Todas'} icon={<CalendarDaysIcon className="h-7 w-7"/>} />
                    </div>
                    
                    {/* Charts */}
                    <ChartCard title="Despesas Mensais (Visão Geral)">
                        <ExpensesBarChart data={barChartData} dataKeys={[{key: 'Valor (R$)', color: '#6366F1'}]} onBarClick={handleMonthlyBarClick}/>
                    </ChartCard>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                       <ChartCard title="Despesas por Tipo" heightClassName="h-80">
                           <ExpensesPieChart data={pieChartData} />
                       </ChartCard>
                       {opportunitiesChartData.length > 0 && (
                           <ChartCard title="Oportunidades de Melhoria (Custos Adicionais)" heightClassName="h-80">
                               <ExpensesPieChart data={opportunitiesChartData} onSliceClick={handleOpportunityChartClick} />
                           </ChartCard>
                       )}
                    </div>
                    
                    {!selectedUnit && unitChartData.length > 1 && (
                         <ChartCard title="Ranking de Despesas por Unidade">
                            <HorizontalRankChart data={unitChartData} onBarClick={handleUnitBarClick} />
                        </ChartCard>
                    )}

                    {selectedMarket === MarketType.LIVRE && marketChartData.length > 0 && (
                        <ChartCard title="Comparativo: Custo Real (Livre) vs Estimado (Cativo)">
                            <ExpensesBarChart 
                                data={marketChartData} 
                                dataKeys={[
                                    { key: 'Custo Real', color: '#3B82F6'},
                                    { key: 'Custo Estimado', color: '#14B8A6'}
                                ]}
                                onBarClick={!selectedCompetence ? handleMarketChartClick : undefined}
                            />
                        </ChartCard>
                    )}
                    
                    {/* Expenses Table */}
                    <ContentCard title="Lançamentos Detalhados">
                       <ExpensesTable 
                            groupedData={paginatedExpenseGroups.paginatedGroups}
                            units={units}
                            competences={competences}
                            onEdit={handleOpenForm}
                            onDelete={handleDelete}
                            userRole={user!.role}
                       />
                       {!selectedCompetence && paginatedExpenseGroups.totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-700 bg-gray-800 px-4 py-3 sm:px-6">
                                <div className="flex flex-1 justify-between sm:hidden">
                                    <button onClick={() => setExpensesPage(p => p - 1)} disabled={expensesPage <= 1} className="relative inline-flex items-center rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-50">Anterior</button>
                                    <button onClick={() => setExpensesPage(p => p + 1)} disabled={expensesPage >= paginatedExpenseGroups.totalPages} className="relative ml-3 inline-flex items-center rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-50">Próxima</button>
                                </div>
                                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-400">
                                            Página <span className="font-medium">{expensesPage}</span> de <span className="font-medium">{paginatedExpenseGroups.totalPages}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                            <button onClick={() => setExpensesPage(p => p - 1)} disabled={expensesPage <= 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-600 hover:bg-gray-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                                                <span className="sr-only">Anterior</span>
                                                &lt;
                                            </button>
                                            <button onClick={() => setExpensesPage(p => p + 1)} disabled={expensesPage >= paginatedExpenseGroups.totalPages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-600 hover:bg-gray-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                                                <span className="sr-only">Próxima</span>
                                                &gt;
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                       )}
                    </ContentCard>
                </div>
            )}
            
            <Modal 
                isOpen={isFormOpen} 
                onClose={handleCloseForm} 
                title={editingExpense ? 'Editar Lançamento' : 'Adicionar Lançamento'}
            >
                <ExpenseForm 
                    expenseToEdit={editingExpense} 
                    onCancel={handleCloseForm} 
                    onSave={handleSaveSuccess}
                    setIsDirty={setIsFormDirty}
                    units={unitsForForm}
                    competences={competences}
                />
            </Modal>

            <UnitDetailModal
                isOpen={isUnitDetailModalOpen}
                onClose={closeUnitDetailModal}
                data={selectedUnitDetails}
            />

            {selectedCompetence && (
              <MonthlyClosingModal
                  isOpen={isClosingModalOpen}
                  onClose={closeClosingModal}
                  competenceId={selectedCompetence}
                  competences={competences}
                  units={units.filter(u => u.marketType === MarketType.LIVRE && (!selectedContract || u.contratoId === selectedContract))}
                  initialEstimates={estimates}
                  onSaveSuccess={loadDashboardData}
                  contratoId={selectedContract}
                  contracts={contracts}
              />
            )}

            {breakdownModalProps && (
                 <BreakdownModal
                    isOpen={isBreakdownModalOpen}
                    onClose={closeBreakdownModal}
                    title={breakdownModalProps.title}
                    data={breakdownModalProps.data}
                    dataLabel={breakdownModalProps.dataLabel}
                    valueLabel={breakdownModalProps.valueLabel}
                    totalValue={breakdownModalProps.totalValue}
                />
            )}

            <Modal
                isOpen={isComparisonDetailModalOpen}
                onClose={closeComparisonDetailModal}
                title={comparisonDetailTitle}
            >
                <div className="space-y-2 max-h-96 overflow-y-auto">
                     {/* Desktop Header */}
                    <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-2 font-semibold text-white bg-gray-700/50 rounded-t-md sticky top-0 z-10">
                        <span>Competência</span>
                        <span className="text-right">Custo Real</span>
                        <span className="text-right">Custo Estimado</span>
                        <span className="text-right">Economia</span>
                    </div>

                     {/* Mobile & Desktop Body */}
                    <div className="divide-y divide-gray-700/50 md:divide-y-0">
                        {comparisonUnitDetails.length > 0 ? comparisonUnitDetails.map((item, index) => {
                            const custoReal = item['Custo Real'];
                            const custoEstimado = item['Custo Estimado'];
                            const economia = custoEstimado - custoReal;
                            return (
                                <React.Fragment key={index}>
                                    {/* Desktop Row */}
                                    <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-3 hover:bg-gray-800/50">
                                        <span className="text-sm text-gray-300">{item.name}</span>
                                        <span className="text-sm font-semibold text-white text-right">{formatCurrency(custoReal)}</span>
                                        <span className="text-sm font-semibold text-white text-right">{formatCurrency(custoEstimado)}</span>
                                        <span className={`text-sm font-bold text-right ${economia >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {formatCurrency(economia)}
                                        </span>
                                    </div>
                                    {/* Mobile Card */}
                                    <div className="block md:hidden p-4 bg-gray-800/50">
                                        <p className="font-bold text-white mb-2">{item.name}</p>
                                        <div className="flex justify-between items-center text-sm border-b border-gray-700 pb-1 mb-1">
                                            <span className="text-gray-400">Custo Real:</span>
                                            <span className="font-semibold text-white">{formatCurrency(custoReal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm border-b border-gray-700 pb-1 mb-1">
                                            <span className="text-gray-400">Custo Estimado:</span>
                                            <span className="font-semibold text-white">{formatCurrency(custoEstimado)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Economia:</span>
                                            <span className={`font-bold ${economia >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {formatCurrency(economia)}
                                            </span>
                                        </div>
                                    </div>
                                </React.Fragment>
                            )
                        }) : (
                            <p className="text-center text-gray-400 py-6">Nenhum dado para exibir.</p>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;