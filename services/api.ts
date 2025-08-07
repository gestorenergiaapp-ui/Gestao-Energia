
import type { User, Unit, Competence, Expense, ExpenseFormData, ChartData, SummaryData, UnitDetailData, Contract, UnitFormData, UserUpdateData } from '../types';

// The base URL for your backend API.
// For local development, this will be http://localhost:4000.
// For production, you will change this to your deployed backend URL.
const API_BASE_URL = 'http://localhost:4000/api';

const handleResponse = async (response: Response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Ocorreu um erro na chamada da API.');
    }
    return data;
};

// --- API FUNCTIONS ---
export const api = {
  // --- Auth ---
  login: async (email: string, password_hash: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password_hash }), // Backend expects 'password'
    });
    const { user, token } = await handleResponse(response);
    localStorage.setItem('authToken', token);
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    return user;
  },
  
  register: async (name: string, email: string, password_hash: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: password_hash }),
    });
    return handleResponse(response);
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },

  logout: (): void => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('loggedInUser');
  },

  checkSession: async (): Promise<User | null> => {
    const token = localStorage.getItem('authToken');
    const userJson = localStorage.getItem('loggedInUser');
    if (token && userJson) {
        // In a real app, you might want to verify the token with the backend here.
        return JSON.parse(userJson) as User;
    }
    return null;
  },

  // --- Metadata ---
  getContracts: async (): Promise<Contract[]> => {
    const response = await fetch(`${API_BASE_URL}/contracts`);
    return handleResponse(response);
  },

  getAllUnits: async (): Promise<Unit[]> => {
    const response = await fetch(`${API_BASE_URL}/units`);
    return handleResponse(response);
  },

  getCompetences: async (): Promise<Competence[]> => {
    const response = await fetch(`${API_BASE_URL}/competences`);
    return handleResponse(response);
  },

  getSummaryData: async (): Promise<SummaryData> => {
    const response = await fetch(`${API_BASE_URL}/summary-data`);
    return handleResponse(response);
  },

  // --- Expenses ---
  getExpenses: async (filters: { contratoId?: string, marketType?: string, unidadeId?: string; competenciaId?: string }): Promise<Expense[]> => {
    const params = new URLSearchParams(filters as Record<string, string>);
    const response = await fetch(`${API_BASE_URL}/expenses?${params.toString()}`);
    return handleResponse(response);
  },

  createExpense: async (data: ExpenseFormData): Promise<Expense> => {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateExpense: async (id: string, data: Partial<ExpenseFormData>): Promise<Expense> => {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteExpense: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/expenses/${id}`, { method: 'DELETE' });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Falha ao excluir.');
    }
  },

  // --- Settings Screen ---
  updateUser: async (id: string, data: UserUpdateData): Promise<User> => {
     const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const updatedUser = await handleResponse(response);
    localStorage.setItem('loggedInUser', JSON.stringify(updatedUser)); // Keep local user in sync
    return updatedUser;
  },

  createUnit: async (data: UnitFormData): Promise<Unit> => {
    const response = await fetch(`${API_BASE_URL}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateUnit: async (id: string, data: Partial<UnitFormData>): Promise<Unit> => {
     const response = await fetch(`${API_BASE_URL}/units/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteUnit: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/units/${id}`, { method: 'DELETE' });
     if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Falha ao excluir.');
    }
  },

  // --- Analysis Endpoints ---
  getDashboardData: async (filters: { contratoId?: string, marketType?: string, unidadeId?: string; competenciaId?: string }) => {
    const params = new URLSearchParams(filters as Record<string, string>);
    const response = await fetch(`${API_BASE_URL}/dashboard?${params.toString()}`);
    return handleResponse(response);
  },
  
  getUnitDetailData: async (unitName: string, filters: { contratoId?: string, marketType?: string; competenciaId?: string; }): Promise<UnitDetailData> => {
    const params = new URLSearchParams(filters as Record<string, string>);
    const response = await fetch(`${API_BASE_URL}/units/details/${encodeURIComponent(unitName)}?${params.toString()}`);
    return handleResponse(response);
  },
};