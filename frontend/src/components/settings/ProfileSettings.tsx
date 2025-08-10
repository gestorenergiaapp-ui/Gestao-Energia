import React, { useState, useContext, useMemo } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import ContentCard from '../shared/ContentCard';
import toast from 'react-hot-toast';
import { useForm } from '../../hooks/useForm';
import type { UserUpdateData } from '../../types';

const commonInputClass = "mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2";
const commonLabelClass = "block text-sm font-medium text-gray-300";

const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useContext(AuthContext);

  const initialFormData = useMemo(() => ({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }), [user]);

  const { formData, handleChange, setFormData } = useForm(initialFormData);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error('A nova senha e a confirmação não correspondem.');
      setLoading(false);
      return;
    }
    
    if (formData.newPassword && !formData.currentPassword) {
        toast.error('Você deve fornecer sua senha atual para definir uma nova.');
        setLoading(false);
        return;
    }

    try {
      const dataToUpdate: UserUpdateData = { name: formData.name, email: formData.email };
      if (formData.newPassword) {
          dataToUpdate.currentPassword = formData.currentPassword;
          dataToUpdate.newPassword = formData.newPassword;
      }

      const updatePromise = api.updateUser(user!._id, dataToUpdate);

      await toast.promise(updatePromise, {
        loading: 'Salvando...',
        success: 'Perfil atualizado com sucesso!',
        error: (err: any) => err?.message || 'Falha ao atualizar o perfil.',
      });
      
      const updatedUser = await updatePromise;
      updateUser(updatedUser); // Update context
      // Clear password fields
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err: any) {
      console.error(err);
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