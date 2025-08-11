import { useState, useCallback } from 'react';
import type { Expense, UnitDetailData } from '@/types';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

export type BreakdownModalProps = {
    title: string;
    data: { name: string; value: number }[];
    dataLabel?: string;
    valueLabel?: string;
    totalValue?: number;
};

export const useDashboardModals = () => {
    // --- State for All Modals ---
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const [isUnitDetailModalOpen, setIsUnitDetailModalOpen] = useState(false);
    const [selectedUnitDetails, setSelectedUnitDetails] = useState<UnitDetailData | null>(null);

    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
    
    const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
    const [breakdownModalProps, setBreakdownModalProps] = useState<BreakdownModalProps | null>(null);

    const [isComparisonDetailModalOpen, setIsComparisonDetailModalOpen] = useState(false);
    const [comparisonDetailTitle, setComparisonDetailTitle] = useState('');
    const [comparisonUnitDetails, setComparisonUnitDetails] = useState<any[]>([]);

    // --- Handlers for Expense Form Modal ---
    const handleOpenForm = useCallback((expense: Expense | null = null) => {
        setEditingExpense(expense);
        setIsFormDirty(false);
        setIsFormOpen(true);
    }, []);
    
    const closeFormModal = useCallback(() => {
        setIsFormOpen(false);
        setEditingExpense(null);
        setIsFormDirty(false);
    }, []);

    const handleCloseForm = useCallback(() => {
        if (isFormDirty) {
            if (window.confirm("Você tem alterações não salvas. Deseja sair mesmo assim?")) {
                closeFormModal();
            }
        } else {
            closeFormModal();
        }
    }, [isFormDirty, closeFormModal]);

    // --- Handlers for Unit Detail Modal ---
    const openUnitDetailModal = useCallback(async (unitName: string, filters: any) => {
        try {
            const detailData = await api.getUnitDetailData(unitName, filters);
            setSelectedUnitDetails(detailData);
            setIsUnitDetailModalOpen(true);
        } catch (error) {
            toast.error(`Não foi possível carregar os detalhes para ${unitName}.`);
            console.error("Failed to get unit details", error);
        }
    }, []);
    const closeUnitDetailModal = useCallback(() => setIsUnitDetailModalOpen(false), []);

    // --- Handlers for Monthly Closing Modal ---
    const openClosingModal = useCallback(() => setIsClosingModalOpen(true), []);
    const closeClosingModal = useCallback(() => setIsClosingModalOpen(false), []);
    
    // --- Handlers for Breakdown Modal ---
    const openBreakdownModal = useCallback((props: BreakdownModalProps) => {
        setBreakdownModalProps(props);
        setIsBreakdownModalOpen(true);
    }, []);
    const closeBreakdownModal = useCallback(() => setIsBreakdownModalOpen(false), []);

    // --- Handlers for Comparison Detail Modal ---
    const openComparisonDetailModal = useCallback((title: string, details: any[]) => {
        setComparisonDetailTitle(title);
        setComparisonUnitDetails(details);
        setIsComparisonDetailModalOpen(true);
    }, []);
    const closeComparisonDetailModal = useCallback(() => setIsComparisonDetailModalOpen(false), []);

    return {
        isFormOpen,
        isFormDirty,
        editingExpense,
        handleOpenForm,
        handleCloseForm,
        closeFormModal,
        setIsFormDirty,

        isUnitDetailModalOpen,
        selectedUnitDetails,
        openUnitDetailModal,
        closeUnitDetailModal,

        isClosingModalOpen,
        openClosingModal,
        closeClosingModal,

        isBreakdownModalOpen,
        breakdownModalProps,
        openBreakdownModal,
        closeBreakdownModal,
        
        isComparisonDetailModalOpen,
        comparisonDetailTitle,
        comparisonUnitDetails,
        openComparisonDetailModal,
        closeComparisonDetailModal,
    };
};