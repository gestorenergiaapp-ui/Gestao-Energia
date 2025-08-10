import React from 'react';
import Modal from '../shared/Modal';

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: { name: string, value: number }[];
  dataLabel?: string;
  valueLabel?: string;
  totalValue?: number;
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const BreakdownModal: React.FC<BreakdownModalProps> = ({ isOpen, onClose, title, data, dataLabel = "Item", valueLabel = "Valor", totalValue }) => {
  if (!data) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {typeof totalValue === 'number' && (
            <div className="bg-gray-900/50 p-3 rounded-lg text-center border border-gray-700">
                <p className="text-sm text-gray-400">Valor Total</p>
                <p className="text-2xl font-bold text-indigo-300">{formatCurrency(totalValue)}</p>
            </div>
        )}
        <div className="sticky top-0 z-10">
            <div className="grid grid-cols-2 gap-4 px-4 py-2 font-semibold text-white bg-gray-700/50 rounded-t-md">
                <span>{dataLabel}</span>
                <span className="text-right">{valueLabel}</span>
            </div>
        </div>
        <div className="divide-y divide-gray-700/50">
            {data.length > 0 ? data.sort((a,b) => b.value - a.value).map((item, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 px-4 py-3 hover:bg-gray-800/50">
                    <span className="text-sm text-gray-300 truncate">{item.name}</span>
                    <span className="text-sm font-semibold text-white text-right">{formatCurrency(item.value)}</span>
                </div>
            )) : (
                <p className="text-center text-gray-400 py-6">Nenhum dado para exibir.</p>
            )}
        </div>
      </div>
    </Modal>
  );
};

export default BreakdownModal;