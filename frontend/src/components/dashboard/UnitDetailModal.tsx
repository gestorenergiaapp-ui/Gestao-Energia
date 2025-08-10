import React from 'react';
import Modal from '../shared/Modal';
import type { UnitDetailData } from '../../types';
import { CurrencyDollarIcon, BoltIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface UnitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UnitDetailData | null;
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatNumber = (value: number, fractionDigits: number = 2) => value.toLocaleString('pt-BR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

const DetailRow: React.FC<{ label: string, value: string | React.ReactNode, className?: string }> = ({ label, value, className = '' }) => (
    <div className={`flex justify-between items-baseline py-2 border-b border-gray-700/50 ${className}`}>
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-base font-semibold text-white">{value}</span>
    </div>
);

const KPICard: React.FC<{ title: string, value: string, icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-gray-700/50 p-4 rounded-lg flex items-center gap-4">
        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-indigo-600/50 rounded-full text-indigo-300">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    </div>
);


const UnitDetailModal: React.FC<UnitDetailModalProps> = ({ isOpen, onClose, data }) => {
  if (!data) return null;

  const { unitName, costComposition, consumptionDetails } = data;
  const totalCost = costComposition.comercializadora + costComposition.distribuidora + costComposition.encargo;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes da Unidade: ${unitName}`}>
      <div className="space-y-6">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard 
                title="Custo Total" 
                value={formatCurrency(totalCost)}
                icon={<CurrencyDollarIcon className="h-6 w-6" />}
            />
            <KPICard 
                title="Consumo Total" 
                value={`${formatNumber(consumptionDetails.totalConsumoMWh, 3)} MWh`}
                icon={<BoltIcon className="h-6 w-6" />}
            />
            <KPICard 
                title="Total de Multas" 
                value={formatCurrency(consumptionDetails.totalMultas)}
                icon={<ExclamationTriangleIcon className="h-6 w-6" />}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-indigo-300 mb-3">Composição de Custos</h4>
                <div className="space-y-1">
                    <DetailRow label="Comercializadora" value={formatCurrency(costComposition.comercializadora)} />
                    <DetailRow label="Distribuidora" value={formatCurrency(costComposition.distribuidora)} />
                    <DetailRow label="Encargos" value={formatCurrency(costComposition.encargo)} />
                </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-indigo-300 mb-3">Indicadores de Multa e Consumo</h4>
                <div className="space-y-1">
                    <DetailRow label="Demanda Ultrapassada" value={`${formatNumber(consumptionDetails.totalDemandaUltrKW)} KW`} />
                    <DetailRow label="Custo Demanda Ultrap." value={formatCurrency(consumptionDetails.totalDemandaUltrValor)} />
                    <DetailRow label="Reativo Excedente" value={`${formatNumber(consumptionDetails.totalReativoKWh)} KWh`} />
                    <DetailRow label="Custo Reativo Exced." value={formatCurrency(consumptionDetails.totalReativoValor)} />
                </div>
            </div>
        </div>
      </div>
    </Modal>
  );
};

export default UnitDetailModal;