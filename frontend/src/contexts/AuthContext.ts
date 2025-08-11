import { createContext } from 'react';
import type { User } from '../types';

export interface AuthContextType {
  user: User | null;
  updateUser: (user: User) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// O contexto agora pode ser indefinido, o que é mais seguro.
// O hook useAuth garantirá que ele nunca seja consumido como indefinido.
export const AuthContext = createContext<AuthContextType | undefined>(undefined);