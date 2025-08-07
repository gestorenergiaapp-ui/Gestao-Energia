
import { createContext } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  updateUser: (user: User) => void;
  login: (email: string, password_hash: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  updateUser: () => {},
  login: async () => {},
  logout: () => {},
});