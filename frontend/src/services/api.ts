import type { User, Unit, Competence, Expense, ExpensePostData, Estimate, UnitDetailData, Contract, UnitFormData, UserUpdateData, ContractFormData, CompetenceFormData, PaginatedAuditLogs } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours

const handleResponse = async (response: Response) => {
    if (response.status === 403) {
        api.logout();
        window.location.reload();
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Sua sessão expirou ou sua conta foi desativada. Por favor, faça login novamente.');
    }
    if (response.status === 204) {
        return;
    }
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Ocorreu um erro na chamada da API.');
    }
    return data;
};

const getUserId = (): string | null => {
    const userJson = sessionStorage.getItem('loggedInUser');
    if (!userJson) return null;
    const user = JSON.parse(userJson) as User;
    return user._id;
};

// Helper for GET requests that automatically includes the userId
const authenticatedGet = async (endpoint: string, params: Record<string, string> = {}) => {
    const userId = getUserId();
    const finalParams = { ...params, ...(userId && { userId }) };
    // Remove empty/null/undefined params
    Object.keys(finalParams).forEach(key => (finalParams[key] == null || finalParams[key] === '') && delete finalParams[key]);
    const searchParams = new URLSearchParams(finalParams);
    const response = await fetch(`${API_BASE_URL}${endpoint}?${searchParams.toString()}`);
    return handleResponse(response);
};

// Helper for CUD operations that includes userId in the body/query
const authenticatedRequest = async (method: 'POST' | 'PUT' | 'DELETE', endpoint: string, body?: object, query?: object) => {
    const userId = getUserId();
    const headers = { 'Content-Type': 'application/json' };
    let finalBody = body ? JSON.stringify({ ...body, userId }) : undefined;
    let finalEndpoint = endpoint;

    if (method === 'DELETE') {
        const params = new URLSearchParams({ ...(query || {}), ...(userId && { userId }) } as Record<string, string>);
        finalEndpoint = `${endpoint}?${params.toString()}`;
    }

    const response = await fetch(`${API_BASE_URL}${finalEndpoint}`, { method, headers, body: finalBody });
    return handleResponse(response);
};


// --- API FUNCTIONS ---
export const api = {
  // --- Auth ---
  login: async (email: string, password: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const { user, token } = await handleResponse(response);
    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('loggedInUser', JSON.stringify(user));
    sessionStorage.setItem('loginTimestamp', Date.now().toString());
    return user;
  },
  
  register: async (name: string, email: string, password: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
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
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('loggedInUser');
    sessionStorage.removeItem('loginTimestamp');
  },

  checkSession: async (): Promise<User | null> => {
    const token = sessionStorage.getItem('authToken');
    const userJson = sessionStorage.getItem('loggedInUser');
    const loginTimestamp = sessionStorage.getItem('loginTimestamp');

    if (token && userJson && loginTimestamp) {
        const sessionAge = Date.now() - parseInt(loginTimestamp, 10);
        if (sessionAge > SESSION_DURATION) {
            api.logout();
            throw new Error("Sessão expirada.");
        }
        return JSON.parse(userJson) as User;
    }
    return null;
  },

  // --- Metadata ---
  getContracts: async (): Promise<Contract[]> => authenticatedGet('/contracts'),
  getAllUnits: async (): Promise<Unit[]> => authenticatedGet('/units'),
  getCompetences: async (): Promise<Competence[]> => authenticatedGet('/competences'),
  getEstimates: async (competenciaId: string): Promise<Estimate[]> => authenticatedGet('/estimates', { competenciaId }),
  
  saveEstimates: async (competenciaId: string, estimates: { unidadeId: string, valor: number }[]): Promise<{ message: string }> => 
    authenticatedRequest('POST', '/estimates', { competenciaId, estimates }),
  
  generateAndSendReport: async(competenciaId: string, emails: string[], contratoId: string): Promise<{ message: string }> =>
    authenticatedRequest('POST', '/reports/generate', { competenciaId, emails, contratoId }),

  // --- Expenses ---
  getExpenses: async (filters: { contratoId?: string, marketType?: string, unidadeId?: string; competenciaId?: string }): Promise<Expense[]> =>
    authenticatedGet('/expenses', filters as Record<string, string>),

  createExpense: async (data: ExpensePostData): Promise<Expense> =>
    authenticatedRequest('POST', '/expenses', data),

  updateExpense: async (id: string, data: Partial<ExpensePostData>): Promise<Expense> =>
    authenticatedRequest('PUT', `/expenses/${id}`, data),

  deleteExpense: async (id: string): Promise<void> =>
    authenticatedRequest('DELETE', `/expenses/${id}`),

  // --- Settings Screen ---
  getUsers: async (): Promise<User[]> => authenticatedGet('/users'),

  updateUser: async (id: string, data: UserUpdateData): Promise<User> => {
     const updatedUser = await authenticatedRequest('PUT', `/users/${id}`, data);
     const currentUserJson = sessionStorage.getItem('loggedInUser');
     if (currentUserJson) {
        const currentUser = JSON.parse(currentUserJson);
        if (currentUser._id === updatedUser._id) {
          sessionStorage.setItem('loggedInUser', JSON.stringify({ ...currentUser, ...updatedUser }));
        }
     }
    return updatedUser;
  },
  
  updateUserStatus: async (id: string, status: User['status']): Promise<void> =>
     authenticatedRequest('PUT', `/users/${id}/status`, { status }),

  updateUserRole: async (id: string, role: User['role']): Promise<void> =>
    authenticatedRequest('PUT', `/users/${id}/role`, { role }),
  
  updateUserUnits: async (id: string, unitIds: string[]): Promise<void> =>
    authenticatedRequest('PUT', `/users/${id}/units`, { unitIds }),

  deleteUser: async (id: string): Promise<void> =>
    authenticatedRequest('DELETE', `/users/${id}`),

  createUnit: async (data: UnitFormData): Promise<Unit> =>
    authenticatedRequest('POST', '/units', data),

  updateUnit: async (id: string, data: Partial<UnitFormData>): Promise<Unit> =>
     authenticatedRequest('PUT', `/units/${id}`, data),

  deleteUnit: async (id: string): Promise<void> =>
    authenticatedRequest('DELETE', `/units/${id}`),

  createContract: async (data: ContractFormData): Promise<Contract> =>
      authenticatedRequest('POST', '/contracts', data),

  updateContract: async (id: string, data: Partial<ContractFormData>): Promise<Contract> =>
       authenticatedRequest('PUT', `/contracts/${id}`, data),

  deleteContract: async (id: string): Promise<void> =>
      authenticatedRequest('DELETE', `/contracts/${id}`),
    
  createCompetence: async (data: CompetenceFormData): Promise<Competence> =>
      authenticatedRequest('POST', '/competences', data),

  deleteCompetence: async (id: string): Promise<void> =>
      authenticatedRequest('DELETE', `/competences/${id}`),
    
  getAuditLogs: async (params: { page?: number, limit?: number }): Promise<PaginatedAuditLogs> =>
    authenticatedGet('/audit-logs', params as Record<string, string>),

  // --- Analysis Endpoints ---
  getDashboardData: async (filters: { contratoId?: string, marketType?: string, unidadeId?: string; competenciaId?: string }) =>
    authenticatedGet('/dashboard', filters as Record<string, string>),
  
  getUnitDetailData: async (unitName: string, filters: { contratoId?: string, marketType?: string; competenciaId?: string; }): Promise<UnitDetailData> =>
    authenticatedGet(`/units/details/${encodeURIComponent(unitName)}`, filters as Record<string, string>),
};