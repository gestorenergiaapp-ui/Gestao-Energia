import React from 'react';
import Modal from '../shared/Modal';
import type { UnitDetailData } from '../../types';

interface UnitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UnitDetailData | null;
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatNumber = (value: number, fractionDigits: number = 2) => value.toLocaleString('pt-BR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

const DetailRow: React.FC<{ label: string, value: string | React.ReactNode, className?: string }> = ({ label, value, className = '' }) => (
    <div className={`flex justify-between items-baseline py-2 ${className}`}>
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-base font-semibold text-white">{value}</span>
    </div>
);

const UnitDetailModal: React.FC<UnitDetailModalProps> = ({ isOpen, onClose, data }) => {
  if (!data) return null;

  const { unitName, costComposition, consumptionDetails } = data;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes da Unidade: ${unitName}`}>
      <div className="space-y-6">
        {/* Cost Composition */}
        <div>
          <h4 className="text-lg font-semibold text-indigo-300 mb-2 border-b border-gray-700 pb-2">Composição de Custos</h4>
          <div className="space-y-1 mt-2">
            <DetailRow label="Comercializadora" value={formatCurrency(costComposition.comercializadora)} />
            <DetailRow label="Distribuidora" value={formatCurrency(costComposition.distribuidora)} />
            <DetailRow label="Encargos" value={formatCurrency(costComposition.encargo)} />
          </div>
        </div>

        {/* Consumption Details */}
        <div>
            <h4 className="text-lg font-semibold text-indigo-300 mb-2 border-b border-gray-700 pb-2">Indicadores de Consumo e Multas</h4>
            <div className="space-y-1 mt-2">
                <DetailRow label="Consumo Total" value={<>{formatNumber(consumptionDetails.totalConsumoMWh, 3)} <span className="text-xs text-gray-400">MWh</span></>} />
                <hr className="border-gray-700 my-2"/>
                <DetailRow label="Demanda Ultrapassada" value={<>{formatNumber(consumptionDetails.totalDemandaUltrKW)} <span className="text-xs text-gray-400">KW</span></>} />
                <DetailRow label="Multa por Demanda" value={formatCurrency(consumptionDetails.totalDemandaUltrValor)} />
                 <hr className="border-gray-700 my-2"/>
                <DetailRow label="Reativo Excedente" value={<>{formatNumber(consumptionDetails.totalReativoKWh)} <span className="text-xs text-gray-400">KWh</span></>} />
                <DetailRow label="Multa por Reativo" value={formatCurrency(consumptionDetails.totalReativoValor)} />
                 <hr className="border-gray-600 my-3"/>
                <DetailRow 
                    label="Somatório das Multas" 
                    value={formatCurrency(consumptionDetails.totalMultas)}
                    className="bg-gray-700/50 px-3 rounded-md"
                 />
            </div>
        </div>
      </div>
    </Modal>
  );
};

export default UnitDetailModal;
