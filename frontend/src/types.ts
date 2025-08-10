export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'gestor' | 'user';
  status: 'pending' | 'active' | 'inactive';
  accessibleUnitIds?: string[];
}

export interface UserUpdateData {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
}

export interface Contract {
    _id: string;
    nome: string;
}

export interface Unit {
  _id: string;
  nome: string;
  contratoId: string;
  marketType: MarketType;
}

export interface Competence {
  _id:string;
  ano: number;
  mes: number;
}

export interface Estimate {
  _id: string;
  unidadeId: string;
  competenciaId: string;
  valor: number;
}

export enum MarketType {
  LIVRE = 'livre',
  CATIVO = 'cativo',
}

export enum ExpenseType {
  COMERCIALIZADORA = "comercializadora",
  DISTRIBUIDORA = "distribuidora",
  ENCARGO = "encargo",
}

export enum SubtypeEncargo {
  ENERGIA_RESERVA = "energia_reserva",
  ERCAP = "ercap",
  CONTRIBUICAO_CCEE = "contribuicao_ccee",
  GARANTIA_FINANCEIRA = "garantia_financeira",
}

export interface DetalhesDistribuidora {
  consumoMWh: number;
  reativoKWh: number;
  reativoValor: number;
  demandaUltrKW: number;
  demandaUltrValor: number;
}

export interface Expense {
  _id: string;
  userId: string;
  unidadeId: string;
  competenciaId: string;
  tipoDespesa: ExpenseType;
  subtipoEncargo: SubtypeEncargo | null;
  valor: number;
  vencimento: string; // ISO Date string
  codigoLancamento?: string;
  detalhesDistribuidora: DetalhesDistribuidora | null;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
}

export type ExpenseFormData = Omit<Expense, '_id' | 'userId' | 'createdAt' | 'updatedAt'>;

// Type for POSTing/PUTing new/updated expense data from the form
export type ExpensePostData = Omit<ExpenseFormData, 'competenciaId'> & {
    competencia: string; // 'YYYY-MM' format
};

export type UnitFormData = Omit<Unit, '_id'>;
export type ContractFormData = Omit<Contract, '_id'>;
export type CompetenceFormData = Omit<Competence, '_id'>;

export interface BarChartData {
    name: string;
    [key: string]: number | string;
}

export interface ChartData extends BarChartData {
    value: number;
}

export interface CostComposition {
    comercializadora: number;
    distribuidora: number;
    encargo: number;
}

export interface ConsumptionDetails {
    totalConsumoMWh: number;
    totalDemandaUltrKW: number;
    totalDemandaUltrValor: number;
    totalReativoKWh: number;
    totalReativoValor: number;
    totalMultas: number;
}

export interface UnitDetailData {
    unitName: string;
    costComposition: CostComposition;
    consumptionDetails: ConsumptionDetails;
}

export interface AuditLog {
    _id: string;
    timestamp: string;
    userName: string;
    action: string;
    entity: string;
    description: string;
}

export interface PaginatedAuditLogs {
    logs: AuditLog[];
    totalLogs: number;
    totalPages: number;
    currentPage: number;
}

export interface GroupedExpense {
    groupKey: string;
    unidadeId: string;
    competenciaId: string;
    expenses: Expense[];
    totalReal: number;
    totalEstimado: number | null;
}
