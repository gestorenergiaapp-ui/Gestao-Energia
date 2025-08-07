import React, { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import ContentCard from '../shared/ContentCard';

const commonInputClass = "mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm";
const commonLabelClass = "block text-sm font-medium text-gray-300";

const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError('A nova senha e a confirmação não correspondem.');
      setLoading(false);
      return;
    }
    
    if (formData.newPassword && !formData.currentPassword) {
        setError('Você deve fornecer sua senha atual para definir uma nova.');
        setLoading(false);
        return;
    }

    try {
      const updatedUser = await api.updateUser(user!._id, {
        name: formData.name,
        email: formData.email,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      updateUser(updatedUser); // Update context
      setSuccess('Perfil atualizado com sucesso!');
      // Clear password fields
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err: any) {
      setError(err.message || 'Falha ao atualizar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContentCard title="Meu Perfil" className="p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className={commonLabelClass}>Nome</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className={commonInputClass} required/>
        </div>
        <div>
          <label htmlFor="email" className={commonLabelClass}>Email</label>
          <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className={commonInputClass} required/>
        </div>

        <div className="pt-4 border-t border-gray-700 space-y-4">
            <p className="text-gray-400 text-sm">Para alterar sua senha, preencha os campos abaixo.</p>
             <div>
                <label htmlFor="currentPassword" className={commonLabelClass}>Senha Atual</label>
                <input type="password" name="currentPassword" id="currentPassword" value={formData.currentPassword} onChange={handleChange} className={commonInputClass} />
            </div>
            <div>
                <label htmlFor="newPassword" className={commonLabelClass}>Nova Senha</label>
                <input type="password" name="newPassword" id="newPassword" value={formData.newPassword} onChange={handleChange} className={commonInputClass} />
            </div>
            <div>
                <label htmlFor="confirmPassword" className={commonLabelClass}>Confirmar Nova Senha</label>
                <input type="password" name="confirmPassword" id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={commonInputClass} />
            </div>
        </div>
        
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        {success && <p className="text-sm text-green-400 text-center">{success}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </ContentCard>
  );
};

export default ProfileSettings;
