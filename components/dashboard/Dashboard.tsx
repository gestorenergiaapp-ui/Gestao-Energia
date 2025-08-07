import React, { useState, useEffect, useContext, useMemo } from 'react';
import { api } from '../../services/api';
import type { Unit, Competence, BarChartData, ChartData, Expense, SummaryData, UnitDetailData, Contract } from '../../types';
import { MarketType } from '../../types';
import KPI from './KPI';
import ChartCard from '../shared/ChartCard';
import ExpensesBarChart from '../charts/ExpensesBarChart';
import ExpensesPieChart from '../charts/ExpensesPieChart';
import Modal from '../shared/Modal';
import ExpenseForm from './ExpenseForm';
import ExpensesTable from './ExpensesTable';
import ContentCard from '../shared/ContentCard';
import UnitDetailModal from './UnitDetailModal';

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


const Dashboard: React.FC = () => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [competences, setCompetences] = useState<Competence[]>([]);
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    
    const [selectedContract, setSelectedContract] = useState<string>('');
    const [selectedMarket, setSelectedMarket] = useState<MarketType>(MarketType.LIVRE);
    const [selectedUnit, setSelectedUnit] = useState<string>('');
    const [selectedCompetence, setSelectedCompetence] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    const [kpis, setKpis] = useState<{ totalDespesas: number; economia: number }>({ totalDespesas: 0, economia: 0 });
    const [pieChartData, setPieChartData] = useState<ChartData[]>([]);
    const [barChartData, setBarChartData] = useState<BarChartData[]>([]);
    const [unitChartData, setUnitChartData] = useState<ChartData[]>([]);
    const [marketChartData, setMarketChartData] = useState<ChartData[]>([]);
    const [opportunitiesChartData, setOpportunitiesChartData] = useState<ChartData[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const [isUnitDetailModalOpen, setIsUnitDetailModalOpen] = useState(false);
    const [selectedUnitDetails, setSelectedUnitDetails] = useState<UnitDetailData | null>(null);

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    const filters = useMemo(() => ({
        contratoId: selectedContract,
        marketType: selectedMarket,
        unidadeId: selectedUnit,
        competenciaId: selectedCompetence,
    }), [selectedContract, selectedMarket, selectedUnit, selectedCompetence]);

    const filteredUnits = useMemo(() => {
        return units
            .filter(u => !selectedContract || u.contratoId === selectedContract)
            .filter(u => u.marketType === selectedMarket);
    }, [units, selectedContract, selectedMarket]);
    
    const handleContractChange = (contractId: string) => {
        setSelectedContract(contractId);
        setSelectedUnit('');
        setSelectedCompetence('');
    };

    const handleMarketChange = (marketType: MarketType) => {
        setSelectedMarket(marketType);
        setSelectedUnit('');
        setSelectedCompetence('');
    };

    const loadInitialMetadata = async () => {
        setLoading(true);
        try {
            const [unitsData, competencesData, summary, contractsData] = await Promise.all([
                api.getAllUnits(),
                api.getCompetences(),
                api.getSummaryData(),
                api.getContracts()
            ]);
            setUnits(unitsData);
            setCompetences(competencesData.sort((a,b) => b.ano - a.ano || b.mes - a.mes));
            setSummaryData(summary);
            setContracts(contractsData);
            if(contractsData.length > 0) {
              setSelectedContract(contractsData[0]._id);
            }
        } catch (error) {
            console.error("Failed to load initial metadata", error);
        }
    };

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [dashboardData, expensesData] = await Promise.all([
                api.getDashboardData(filters),
                api.getExpenses(filters),
            ]);
            setKpis(dashboardData.kpis);
            setPieChartData(dashboardData.charts.despesasPorTipo);
            setBarChartData(dashboardData.charts.monthlyExpenses);
            setUnitChartData(dashboardData.charts.despesasPorUnidade);
            setMarketChartData(dashboardData.charts.mercadoComparison);
            setOpportunitiesChartData(dashboardData.charts.oportunidadesMelhora);
            setExpenses(expensesData.sort((a,b) => new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime()));
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    }
    
    useEffect(() => {
       loadInitialMetadata();
    }, []);

    useEffect(() => {
        // Run only after initial data is loaded and a contract is set
        if (selectedContract) {
            loadDashboardData();
        }
    }, [filters]);

    const handleOpenForm = (expense: Expense | null = null) => {
        setEditingExpense(expense);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingExpense(null);
    };

    const handleSaveSuccess = () => {
        handleCloseForm();
        loadDashboardData();
    };

    const handleDelete = async (expenseId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta despesa?')) {
            try {
                await api.deleteExpense(expenseId);
                loadDashboardData();
            } catch (error) {
                console.error("Failed to delete expense", error);
                alert("Falha ao excluir a despesa.");
            }
        }
    };

    const handleUnitChartClick = async (payload: any) => {
        if (payload && payload.name) {
            try {
                const detailData = await api.getUnitDetailData(payload.name, filters);
                setSelectedUnitDetails(detailData);
                setIsUnitDetailModalOpen(true);
            } catch (error) {
                console.error("Failed to get unit details", error);
                alert(`Não foi possível carregar os detalhes para ${payload.name}.`);
            }
        }
    };

    const unitsForForm = useMemo(() => {
        return units.filter(u => !selectedContract || u.contratoId === selectedContract);
    }, [units, selectedContract])

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
                                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            >
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
                   <button onClick={() => handleOpenForm()} className="mt-4 sm:mt-0 w-full sm:w-auto shrink-0 inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                       Adicionar Lançamento
                    </button>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                    <h3 className="text-md font-semibold text-white mb-2">Filtros Adicionais</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="unit-filter" className="block text-sm font-medium text-gray-300">Unidade</label>
                            <select
                                id="unit-filter"
                                value={selectedUnit}
                                onChange={(e) => setSelectedUnit(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                                onChange={(e) => setSelectedCompetence(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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

            {loading || !summaryData ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* KPIs */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <KPI title="Total de Despesas" value={formatCurrency(kpis.totalDespesas)} />
                        {selectedMarket === MarketType.LIVRE && (
                            <KPI title="Economia vs. Cativo" value={formatCurrency(kpis.economia)} />
                        )}
                        <KPI title="Unidades na Análise" value={selectedUnit ? '1' : `${filteredUnits.length}`} />
                        <KPI title="Competências na Análise" value={selectedCompetence ? '1' : 'Todas'} />
                    </div>
                    
                    {/* Charts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                       <ChartCard title="Despesas Mensais (Visão Geral)">
                            <ExpensesBarChart data={barChartData} />
                        </ChartCard>
                        <ChartCard title="Despesas por Tipo">
                            <ExpensesPieChart data={pieChartData} />
                        </ChartCard>
                        {!selectedUnit && unitChartData.length > 1 && (
                            <ChartCard title="Despesas por Unidade">
                                <ExpensesPieChart data={unitChartData} onSliceClick={handleUnitChartClick} />
                            </ChartCard>
                        )}
                        {selectedMarket === MarketType.LIVRE && marketChartData.some(d => d.value > 0) && (
                            <ChartCard title="Comparativo: Custo Real (Livre) vs Estimado (Cativo)">
                                <ExpensesBarChart data={marketChartData} dataKey="value" />
                            </ChartCard>
                        )}
                         {opportunitiesChartData.length > 0 && (
                            <ChartCard title="Oportunidades de Melhoria (Custos Adicionais)">
                                <ExpensesPieChart data={opportunitiesChartData} />
                            </ChartCard>
                        )}
                    </div>
                    
                    {/* Expenses Table */}
                    <ContentCard title="Lançamentos Detalhados">
                       <ExpensesTable 
                            expenses={expenses} 
                            units={units}
                            competences={competences}
                            summaryData={summaryData}
                            onEdit={handleOpenForm}
                            onDelete={handleDelete}
                       />
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
                    onClose={handleCloseForm} 
                    onSave={handleSaveSuccess}
                    units={unitsForForm}
                    competences={competences}
                />
            </Modal>

            <UnitDetailModal
                isOpen={isUnitDetailModalOpen}
                onClose={() => setIsUnitDetailModalOpen(false)}
                data={selectedUnitDetails}
            />
        </div>
    );
};

export default Dashboard;