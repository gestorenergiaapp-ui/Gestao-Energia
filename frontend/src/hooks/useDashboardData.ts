import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import type { Unit, Competence, BarChartData, ChartData, Expense, Estimate, Contract } from '@/types';
import toast from 'react-hot-toast';

export const useDashboardData = (filters: any, selectedCompetence: string) => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [competences, setCompetences] = useState<Competence[]>([]);
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [reloading, setReloading] = useState<boolean>(false);

    const [kpis, setKpis] = useState<{ totalDespesas: number; economia: number }>({ totalDespesas: 0, economia: 0 });
    const [pieChartData, setPieChartData] = useState<ChartData[]>([]);
    const [barChartData, setBarChartData] = useState<BarChartData[]>([]);
    const [unitChartData, setUnitChartData] = useState<ChartData[]>([]);
    const [marketChartData, setMarketChartData] = useState<BarChartData[]>([]);
    const [opportunitiesChartData, setOpportunitiesChartData] = useState<ChartData[]>([]);
    const [totalsByGroup, setTotalsByGroup] = useState<Record<string, {real: number, estimado: number}>>({});

    const loadInitialMetadata = useCallback(async () => {
        setLoading(true);
        try {
            const [unitsData, competencesData, contractsData] = await Promise.all([
                api.getAllUnits(),
                api.getCompetences(),
                api.getContracts()
            ]);
            setUnits(unitsData);
            setCompetences(competencesData.sort((a,b) => b.ano - a.ano || b.mes - a.mes));
            setContracts(contractsData);
        } catch (error) {
            toast.error("Falha ao carregar dados iniciais.");
            console.error("Failed to load initial metadata", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadDashboardData = useCallback(async () => {
        setReloading(true);
        try {
            const [dashboardData, expensesData, estimatesData] = await Promise.all([
                api.getDashboardData(filters),
                api.getExpenses(filters),
                selectedCompetence ? api.getEstimates(selectedCompetence) : Promise.resolve([])
            ]);

            setKpis(dashboardData.kpis || { totalDespesas: 0, economia: 0 });
            const charts = dashboardData.charts || {};
            setPieChartData(charts.despesasPorTipo || []);
            setBarChartData(charts.monthlyExpenses || []);
            setUnitChartData(charts.despesasPorUnidade || []);
            setMarketChartData(charts.mercadoComparison || []);
            setOpportunitiesChartData(charts.oportunidadesMelhora || []);
            setTotalsByGroup(dashboardData.rawData?.totalsByGroup || {});
            
            setExpenses(expensesData.sort((a,b) => new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime()));
            setEstimates(estimatesData);
        } catch (error) {
            toast.error("Falha ao carregar dados do dashboard.");
            console.error("Failed to load dashboard data", error);
        } finally {
            setReloading(false);
        }
    }, [filters, selectedCompetence]);

    useEffect(() => {
       loadInitialMetadata();
    }, [loadInitialMetadata]);

    useEffect(() => {
        if (!loading) {
            loadDashboardData();
        }
    }, [loading, loadDashboardData]);
    
    const reloadCompetences = useCallback(async () => {
         api.getCompetences().then(data => setCompetences(data.sort((a,b) => b.ano - a.ano || b.mes - a.mes)));
    }, []);

    return {
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
        reloadCompetences
    };
};