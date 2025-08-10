import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { api } from '../../services/api';
import type { Unit, Competence, Estimate, Contract } from '../../types';
import toast from 'react-hot-toast';
import _ from 'lodash';

interface MonthlyClosingModalProps {
    isOpen: boolean;
    onClose: () => void;
    competenceId: string;
    competences: Competence[];
    units: Unit[];
    initialEstimates: Estimate[];
    onSaveSuccess: () => void;
    contratoId: string;
    contracts: Contract[];
}

const MonthlyClosingModal: React.FC<MonthlyClosingModalProps> = ({ 
    isOpen, onClose, competenceId, competences, units, initialEstimates, onSaveSuccess, contratoId, contracts
}) => {
    const [estimates, setEstimates] = useState<Record<string, string>>({});
    const [initialEstimatesState, setInitialEstimatesState] = useState<Record<string, string>>({});
    const [isDirty, setIsDirty] = useState(false);
    const [emails, setEmails] = useState('');
    const [loadingSave, setLoadingSave] = useState(false);
    const [loadingSend, setLoadingSend] = useState(false);

    const competence = competences.find(c => c._id === competenceId);
    const competenceName = competence ? `${String(competence.mes).padStart(2, '0')}/${competence.ano}` : 'N/A';
    
    const contract = contracts.find(c => c._id === contratoId);
    const contractName = contract ? contract.nome : 'Todos os Contratos';

    const title = `Fechamento de Mês: ${competenceName} (${contractName})`;

    useEffect(() => {
        if (isOpen) {
            const initialValues = initialEstimates.reduce((acc, est) => {
                acc[est.unidadeId] = est.valor.toString();
                return acc;
            }, {} as Record<string, string>);
            setEstimates(initialValues);
            setInitialEstimatesState(initialValues);
            setEmails('');
            setIsDirty(false);
        }
    }, [isOpen, initialEstimates]);

    useEffect(() => {
        if(isOpen) {
            setIsDirty(!_.isEqual(estimates, initialEstimatesState));
        }
    }, [estimates, initialEstimatesState, isOpen]);


    const handleEstimateChange = (unitId: string, value: string) => {
        setEstimates(prev => ({ ...prev, [unitId]: value }));
    };

    const handleSaveEstimates = async () => {
        setLoadingSave(true);
        const estimatesToSave = Object.entries(estimates)
            .map(([unidadeId, valor]) => ({
                unidadeId,
                valor: parseFloat(valor) || 0
            }))
            .filter(est => est.valor > 0);
        
        try {
            await api.saveEstimates(competenceId, estimatesToSave);
            toast.success('Estimativas salvas com sucesso!');
            setInitialEstimatesState(estimates); // Update the initial state to the new saved state
            setIsDirty(false);
            onSaveSuccess(); // Refresh dashboard data
        } catch (err: any) {
            const message = err instanceof Error ? err.message : 'Falha ao salvar estimativas.';
            toast.error(message);
        } finally {
            setLoadingSave(false);
        }
    };
    
    const handleSendReport = async () => {
        const emailList = emails.split(',').map(e => e.trim()).filter(e => e);
        if (emailList.length === 0) {
            toast.error('Por favor, insira pelo menos um e-mail válido.');
            return;
        }

        setLoadingSend(true);
        try {
            const reportPromise = api.generateAndSendReport(competenceId, emailList, contratoId);
            await toast.promise(reportPromise, {
                loading: 'Gerando e enviando relatório...',
                success: (data: { message: string }) => data.message,
                error: (err: any) => {
                    if (err instanceof Error) return err.message;
                    return 'Ocorreu um erro ao gerar e enviar o relatório.';
                },
            });
        } catch (err: unknown) {
            console.error("Error sending report:", err);
            // Error is handled by toast.promise
        } finally {
            setLoadingSend(false);
        }
    }

    const handleClose = () => {
        if (isDirty) {
            if (window.confirm("Você tem alterações não salvas. Deseja sair mesmo assim?")) {
                onClose();
            }
        } else {
            onClose();
        }
    };
    
    const commonInputClass = "mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2";
    const commonLabelClass = "block text-sm font-medium text-gray-300";

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title}>
            <div className="space-y-6">
                {/* Step 1: Input Estimates */}
                <div>
                    <h3 className="text-lg font-semibold text-indigo-300">1. Inserir Custo Estimado no Cativo</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-4">
                        Para cada unidade do Mercado Livre, informe o custo que ela teria se estivesse no Mercado Cativo nesta competência.
                    </p>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {units.length > 0 ? units.map(unit => (
                            <div key={unit._id}>
                                <label htmlFor={`estimate-${unit._id}`} className={commonLabelClass}>{unit.nome}</label>
                                <input
                                    type="number"
                                    id={`estimate-${unit._id}`}
                                    name={`estimate-${unit._id}`}
                                    value={estimates[unit._id] || ''}
                                    onChange={(e) => handleEstimateChange(unit._id, e.target.value)}
                                    placeholder="Ex: 15000.00"
                                    className={commonInputClass}
                                />
                            </div>
                        )) : (
                            <p className="text-center text-gray-400 py-4">Nenhuma unidade do Mercado Livre encontrada para este contrato.</p>
                        )}
                    </div>
                     <div className="flex justify-end mt-4">
                        <button 
                            onClick={handleSaveEstimates} 
                            disabled={loadingSave || units.length === 0}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                        >
                            {loadingSave ? 'Salvando...' : 'Salvar Estimativas'}
                        </button>
                     </div>
                </div>

                {/* Step 2: Send Report */}
                <div className="pt-6 border-t border-gray-700">
                    <h3 className="text-lg font-semibold text-teal-300">2. Enviar Relatório por E-mail</h3>
                     <p className="text-sm text-gray-400 mt-1 mb-4">
                        Insira os e-mails dos destinatários, separados por vírgula.
                    </p>
                    <div>
                         <label htmlFor="emails" className={commonLabelClass}>E-mails dos Destinatários</label>
                         <input
                            type="text"
                            id="emails"
                            name="emails"
                            value={emails}
                            onChange={(e) => setEmails(e.target.value)}
                            placeholder="email1@exemplo.com, email2@exemplo.com"
                            className={commonInputClass}
                        />
                    </div>
                     <div className="flex justify-end mt-4">
                        <button 
                            onClick={handleSendReport} 
                            disabled={loadingSend}
                            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:bg-teal-400 disabled:cursor-not-allowed"
                        >
                            {loadingSend ? 'Enviando...' : 'Gerar e Enviar Relatório'}
                        </button>
                     </div>
                </div>
            </div>
        </Modal>
    );
};

export default MonthlyClosingModal;