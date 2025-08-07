import { ExpenseType, SubtypeEncargo, MarketType } from './types';

export const MARKET_TYPE_OPTIONS = [
    { value: MarketType.LIVRE, label: 'Mercado Livre' },
    { value: MarketType.CATIVO, label: 'Mercado Cativo' },
];

export const EXPENSE_TYPE_OPTIONS = [
    { value: ExpenseType.COMERCIALIZADORA, label: 'Comercializadora' },
    { value: ExpenseType.DISTRIBUIDORA, label: 'Distribuidora' },
    { value: ExpenseType.ENCARGO, label: 'Encargo' },
];

export const SUBTYPE_ENCARGO_OPTIONS = [
    { value: SubtypeEncargo.ENERGIA_RESERVA, label: 'Energia de Reserva' },
    { value: SubtypeEncargo.ERCAP, label: 'ERCap' },
    { value: SubtypeEncargo.CONTRIBUICAO_CCEE, label: 'Contribuição CCEE' },
    { value: SubtypeEncargo.GARANTIA_FINANCEIRA, label: 'Garantia Financeira' },
];