import React, { useState } from 'react';
import Modal from '../shared/Modal';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.forgotPassword(email);
      toast.success(response.message);
      setIsSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setIsSuccess(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Recuperar Senha"
    >
      {isSuccess ? (
        <div className="text-center">
            <p className="text-gray-300">
                A solicitação de recuperação foi processada. Se houver uma conta associada ao e-mail fornecido, você receberá as instruções para redefinir sua senha em breve.
            </p>
             <div className="flex justify-center mt-6">
                <button onClick={handleClose} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                    Fechar
                </button>
            </div>
        </div>
      ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm text-gray-300">
              Digite seu e-mail abaixo. Se ele estiver cadastrado em nosso sistema, enviaremos uma nova senha temporária para você.
            </p>
            <div>
              <label htmlFor="recovery-email" className="sr-only">Email</label>
              <input
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                placeholder="seu-email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
              <button type="button" onClick={handleClose} className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
      )}
    </Modal>
  );
};

export default ForgotPasswordModal;