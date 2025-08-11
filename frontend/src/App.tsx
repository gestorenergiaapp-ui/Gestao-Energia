import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AuthContext } from './contexts/AuthContext';
import LoginScreen from './components/login/LoginScreen';
import RegisterScreen from './components/login/RegisterScreen';
import Dashboard from './components/dashboard/Dashboard';
import SettingsScreen from './components/settings/SettingsScreen';
import Header from './components/shared/Header';
import type { User } from './types';
import { api } from './services/api';
import _ from 'lodash';
import toast, { Toaster } from 'react-hot-toast';

type Page = 'dashboard' | 'settings';
type AuthView = 'login' | 'register';
type BackendStatus = 'loading' | 'ok' | 'error';

const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // For session check
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [authView, setAuthView] = useState<AuthView>('login');
  
  // New state for backend health check
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [apiUrl, setApiUrl] = useState<string>('');


  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    setCurrentPage('dashboard');
    setAuthView('login');
  }, []);

  useEffect(() => {
    // This effect runs only once to check backend connectivity
    const verifyBackendConnection = async () => {
        const { ok, url } = await api.checkBackendStatus();
        setApiUrl(url);
        setBackendStatus(ok ? 'ok' : 'error');
    };
    verifyBackendConnection();
  }, []);

  useEffect(() => {
    // This effect runs only after backend is confirmed to be reachable
    if (backendStatus !== 'ok') return;

    const checkSession = async () => {
      setLoading(true);
      try {
        const loggedInUser = await api.checkSession();
        if (loggedInUser) {
          setUser(loggedInUser);
        }
      } catch (error) {
        console.error("Session check failed", error);
        logout(); // Force logout on session error
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [logout, backendStatus]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        toast('Sua sessão expirou por inatividade.', { icon: '🔒' });
        logout();
      }, SESSION_DURATION);
    };

    if (user) {
      const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
      
      resetTimeout(); // Initial timeout set
      
      events.forEach(event => window.addEventListener(event, resetTimeout));

      return () => {
        clearTimeout(timeoutId);
        events.forEach(event => window.removeEventListener(event, resetTimeout));
      };
    }
  }, [user, logout]);


  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const loggedInUser = await api.login(email, password);
    setUser(loggedInUser);
    setCurrentPage('dashboard'); // Reset to dashboard on login
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);


  const authContextValue = useMemo(() => ({
    user,
    login,
    logout,
    updateUser,
  }), [user, login, logout, updateUser]);

  // --- RENDER LOGIC ---

  // 1. Initial check for missing VITE_API_BASE_URL (most critical build-time error)
  if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-900 text-white p-8">
        <div className="text-center bg-red-800 p-6 rounded-lg shadow-lg border border-red-600 max-w-2xl">
          <h1 className="text-3xl font-bold text-yellow-300 mb-4">Erro Crítico de Configuração</h1>
          <p className="text-lg">
            A variável de ambiente <code className="bg-red-700 px-2 py-1 rounded font-mono">VITE_API_BASE_URL</code> não foi definida durante o build.
          </p>
          <p className="mt-4 text-red-200">
            Para que a aplicação funcione, você deve configurar esta variável no seu serviço de hospedagem (ex: Netlify, Vercel) com a URL completa da sua API backend.
          </p>
           <p className="mt-2 text-xs text-red-300">
            Exemplo: <code className="bg-red-700 px-2 py-1 rounded font-mono">https://seu-backend.vercel.app/api</code>
          </p>
        </div>
      </div>
    );
  }

  // 2. Health check loading state
  if (backendStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <div className="text-white text-xl">Verificando conexão com o servidor...</div>
      </div>
    );
  }

  // 3. Health check error state
  if (backendStatus === 'error') {
     return (
      <div className="flex items-center justify-center min-h-screen bg-red-900 text-white p-8">
        <div className="text-center bg-red-800 p-6 rounded-lg shadow-lg border border-red-600 max-w-3xl">
          <h1 className="text-3xl font-bold text-yellow-300 mb-4">Falha de Conexão com o Backend</h1>
          <p className="text-lg mb-4">
            O frontend não conseguiu se comunicar com o servidor através da rota de verificação.
          </p>
          <div className="bg-gray-900 p-3 rounded-md mb-4">
             <p className="text-sm text-gray-400">URL de verificação de saúde:</p>
             <code className="text-yellow-300 font-mono break-all">{apiUrl || 'Não definida'}</code>
          </div>
          <div className="text-left text-red-200">
            <p className="font-bold mb-2">Por favor, verifique os seguintes pontos:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>O deploy do backend na **Vercel** foi concluído com sucesso e o servidor está no ar?</li>
              <li>A variável <code className="bg-red-700 px-1 rounded font-mono">VITE_API_BASE_URL</code> está correta no painel do **Frontend** (Netlify/Vercel)? (Deve incluir `/api` no final)</li>
              <li>A variável <code className="bg-red-700 px-1 rounded font-mono">CORS_ORIGIN</code> no painel do **Backend** (Vercel) contém a URL exata do frontend? (Ex: `https://app.netlify.app`)</li>
              <li>Se estiver usando **Preview Deploys**, as URLs temporárias (ex: `*-ui.netlify.app`) também foram adicionadas à variável `CORS_ORIGIN` no backend?</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
  
  // 4. Session loading state (after backend is confirmed OK)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <div className="text-white text-xl">Carregando sessão...</div>
      </div>
    );
  }

  // 5. Main app render (logged in or login screen)
  return (
    <AuthContext.Provider value={authContextValue}>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: '#1f2937', // bg-gray-800
            color: '#F9FAFB',     // text-gray-50
            border: '1px solid #4b5563' // border-gray-600
          },
          error: {
            iconTheme: {
              primary: '#f87171', // text-red-400
              secondary: '#1f2937'
            }
          },
          success: {
             iconTheme: {
              primary: '#34d399', // text-green-400
              secondary: '#1f2937'
            }
          }
        }}
      />
      <div className="min-h-screen bg-gray-900 text-gray-100">
        {user ? (
          <>
            <Header 
              onLogout={logout} 
              userName={user.name} 
              onNavigate={setCurrentPage} 
              currentPage={currentPage}
            />
            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {currentPage === 'dashboard' && <Dashboard />}
              {currentPage === 'settings' && <SettingsScreen />}
            </main>
          </>
        ) : (
          <>
            {authView === 'login' && <LoginScreen onSwitchToRegister={() => setAuthView('register')} />}
            {authView === 'register' && <RegisterScreen onSwitchToLogin={() => setAuthView('login')} />}
          </>
        )}
      </div>
    </AuthContext.Provider>
  );
};

export default App;