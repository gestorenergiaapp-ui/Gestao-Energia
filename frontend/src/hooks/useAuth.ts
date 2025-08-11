import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';

/**
 * Custom hook to consume AuthContext.
 * Ensures the context is used within an AuthProvider and provides type-safe access.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within the AuthContext.Provider');
  }
  return context;
};
