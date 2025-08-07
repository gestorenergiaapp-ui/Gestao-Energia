
import React, { useState, useMemo, useCallback } from 'react';
import { AuthContext } from './contexts/AuthContext';
import LoginScreen from './components/login/LoginScreen';
import RegisterScreen from './components/login/RegisterScreen';
import Dashboard from './components/dashboard/Dashboard';
import SettingsScreen from './components/settings/SettingsScreen';
import Header from './components/shared/Header';
import type { User } from './types';
import { api } from './services/api';

type Page = 'dashboard' | 'settings';
type AuthView = 'login' | 'register';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [authView, setAuthView] = useState<AuthView>('login');

  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const loggedInUser = await api.checkSession();
        if (loggedInUser) {
          setUser(loggedInUser);
        }
      } catch (error) {
        console.error("Session check failed", error);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = useCallback(async (email: string, password_hash: string): Promise<void> => {
    const loggedInUser = await api.login(email, password_hash);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    setCurrentPage('dashboard');
    setAuthView('login');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        {user ? (
          <>
            <Header onLogout={logout} userName={user.name} onNavigate={setCurrentPage} currentPage={currentPage} />
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