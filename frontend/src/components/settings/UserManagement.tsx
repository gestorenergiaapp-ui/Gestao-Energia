import React, { useState, useEffect, useCallback } from 'react';
import ContentCard from '@/components/shared/ContentCard';
import { api } from '@/services/api';
import type { User, Unit } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import UserUnitsModal from './UserUnitsModal';
import { 
    TrashIcon,
    CheckCircleIcon,
    NoSymbolIcon,
    UserPlusIcon,
    BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const UserManagement: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [allUnits, setAllUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUnitsModalOpen, setIsUnitsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const reloadData = useCallback(async () => {
        setLoading(true);
        try {
            const [usersData, unitsData] = await Promise.all([
                api.getUsers(),
                api.getAllUnits()
            ]);
            setUsers(usersData);
            setAllUnits(unitsData);
        } catch (error) {
            toast.error("Falha ao carregar dados dos usuários.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reloadData();
    }, [reloadData]);

    const handleOpenUnitsModal = (user: User) => {
        setSelectedUser(user);
        setIsUnitsModalOpen(true);
    };

    const handleCloseUnitsModal = () => {
        setSelectedUser(null);
        setIsUnitsModalOpen(false);
    };

    const handleSaveUnits = () => {
        reloadData();
        handleCloseUnitsModal();
    };

    const handleUpdateStatus = async (userToUpdate: User, newStatus: User['status']) => {
        const actionTextMap = {
            active: 'ativar',
            inactive: 'inativar',
        };
        const actionText = newStatus === 'active' && userToUpdate.status === 'pending'
            ? 'aprovar'
            : actionTextMap[newStatus as keyof typeof actionTextMap];

        if(window.confirm(`Tem certeza que deseja ${actionText} o usuário '${userToUpdate.name}'?`)) {
            const statusPromise = api.updateUserStatus(userToUpdate._id, newStatus);
            toast.promise(statusPromise, {
                loading: 'Atualizando status...',
                success: 'Status do usuário atualizado com sucesso!',
                error: (err: any) => `Falha ao atualizar status: ${err?.message || 'Erro desconhecido.'}`
            });

            try {
                await statusPromise;
                reloadData();
            } catch (error) {
                console.error(`Failed to ${actionText} user`, error);
            }
        }
    };

    const handleRoleChange = async (userId: string, newRole: User['role']) => {
        const rolePromise = api.updateUserRole(userId, newRole);
        toast.promise(rolePromise, {
            loading: 'Alterando perfil...',
            success: 'Perfil do usuário alterado com sucesso!',
            error: (err: any) => {
                reloadData(); // Revert UI change on error
                return `Falha ao alterar perfil: ${err?.message || 'Erro desconhecido.'}`;
            }
        });

        try {
            await rolePromise;
            reloadData();
        } catch(error: any) {
            console.error("Failed to change user role", error);
        }
    };

    const handleDelete = async (userId: string) => {
        if(window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
            const deletePromise = api.deleteUser(userId);
            toast.promise(deletePromise, {
                loading: 'Excluindo usuário...',
                success: 'Usuário excluído com sucesso!',
                error: (err: any) => `Falha ao excluir usuário: ${err?.message || 'Erro desconhecido.'}`
            });

            try {
                await deletePromise;
                reloadData();
            } catch (error) {
                console.error("Failed to delete user", error);
            }
        }
    };
    
    const statusBadgeClass = (status: User['status']) => {
        switch (status) {
            case 'active':
                return 'bg-green-500/20 text-green-300';
            case 'pending':
                return 'bg-yellow-500/20 text-yellow-300';
            case 'inactive':
                return 'bg-gray-500/20 text-gray-300';
            default:
                return 'bg-gray-500/20 text-gray-300';
        }
    };
    
    const statusText = (status: User['status']) => {
        const map = { active: 'Ativo', pending: 'Pendente', inactive: 'Inativo' };
        return map[status] || 'Desconhecido';
    };

    return (
        <>
        <ContentCard title="Gerenciar Usuários" className="p-0">
             <div className="p-4">
                 {/* Desktop Table */}
                <div className="hidden md:block">
                    <table className="min-w-full">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Nome</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">Email</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">Perfil</th>
                                <th className="px-3 py-3.5 text-center text-sm font-semibold text-white">Unidades</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-white">Status</th>
                                <th className="px-3 py-3.5 text-center text-sm font-semibold text-white">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-900 divide-y divide-gray-800">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                            ) : users.length > 0 ? (
                                users.map(user => {
                                    const isMainAdmin = user.email === 'admin@example.com';
                                    const isCurrentUser = user._id === currentUser?._id;
                                    const canManageUnits = !isMainAdmin && user.role !== 'admin';

                                    return (
                                    <tr key={user._id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{user.name}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{user.email}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                            <select 
                                            name="role" 
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user._id, e.target.value as User['role'])}
                                            disabled={isMainAdmin || isCurrentUser}
                                            className="w-full md:w-auto bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-3 py-2 disabled:bg-gray-800/50 disabled:cursor-not-allowed disabled:text-gray-400"
                                            >
                                                <option value="user">Usuário</option>
                                                <option value="gestor">Gestor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 text-center">
                                            {canManageUnits ? (
                                                <button
                                                    onClick={() => handleOpenUnitsModal(user)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-900/50 px-3 py-1 text-sm font-semibold text-sky-300 shadow-sm hover:bg-sky-900"
                                                    title="Gerenciar Unidades"
                                                >
                                                    <BuildingOfficeIcon className="h-4 w-4" />
                                                    <span>{user.accessibleUnitIds?.length || 0}</span>
                                                </button>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeClass(user.status)}`}>
                                            {statusText(user.status)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap py-4 text-sm font-medium">
                                            <div className="flex items-center justify-center gap-x-4">
                                                {user.status === 'pending' && (
                                                    <button onClick={() => handleUpdateStatus(user, 'active')} title="Aprovar Usuário" className="text-green-400 hover:text-green-300">
                                                        <CheckCircleIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                                {user.status === 'active' && !isMainAdmin && !isCurrentUser && (
                                                    <button onClick={() => handleUpdateStatus(user, 'inactive')} title="Inativar Usuário" className="text-yellow-400 hover:text-yellow-300">
                                                        <NoSymbolIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                                {user.status === 'inactive' && (
                                                    <button onClick={() => handleUpdateStatus(user, 'active')} title="Reativar Usuário" className="text-green-400 hover:text-green-300">
                                                        <UserPlusIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                                {!isMainAdmin && (
                                                    <button onClick={() => handleDelete(user._id)} title="Excluir Usuário" className="text-red-500 hover:text-red-400">
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum usuário encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                 <div className="block md:hidden space-y-4">
                     {loading ? (
                        <p className="text-center py-8 text-gray-400">Carregando...</p>
                     ) : users.length > 0 ? (
                        users.map(user => {
                            const isMainAdmin = user.email === 'admin@example.com';
                            const isCurrentUser = user._id === currentUser?._id;
                            const canManageUnits = !isMainAdmin && user.role !== 'admin';
                            return (
                                <div key={user._id} className="bg-gray-800/50 p-4 rounded-lg shadow-md">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-white">{user.name}</p>
                                            <p className="text-sm text-gray-400">{user.email}</p>
                                        </div>
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeClass(user.status)}`}>
                                          {statusText(user.status)}
                                        </span>
                                    </div>
                                    <div className="mt-4 pt-2 border-t border-gray-700/50 grid grid-cols-2 gap-4">
                                         <div>
                                            <label htmlFor={`role-${user._id}`} className="block text-xs font-medium text-gray-400 mb-1">Perfil</label>
                                            <select 
                                            id={`role-${user._id}`}
                                            name="role" 
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user._id, e.target.value as User['role'])}
                                            disabled={isMainAdmin || isCurrentUser}
                                            className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-3 py-2 disabled:bg-gray-800/50 disabled:cursor-not-allowed disabled:text-gray-400"
                                            >
                                                <option value="user">Usuário</option>
                                                <option value="gestor">Gestor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                         </div>
                                         <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Permissões</label>
                                            {canManageUnits ? (
                                                <button onClick={() => handleOpenUnitsModal(user)} title="Gerenciar Unidades" className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-md bg-sky-900/50 px-3 py-1 text-sm font-semibold text-sky-300 shadow-sm hover:bg-sky-900">
                                                    <BuildingOfficeIcon className="h-5 w-5" />
                                                    <span>{user.accessibleUnitIds?.length || 0} Unidades</span>
                                                </button>
                                            ) : (
                                                <div className="w-full h-10 flex items-center justify-center rounded-md bg-gray-700/30 text-gray-500 text-sm">N/A</div>
                                            )}
                                         </div>
                                    </div>
                                    <div className="flex justify-end items-center gap-4 mt-4 pt-2 border-t border-gray-700/50">
                                        {user.status === 'pending' && (
                                            <button onClick={() => handleUpdateStatus(user, 'active')} title="Aprovar Usuário" className="text-green-400 hover:text-green-300"><CheckCircleIcon className="h-6 w-6" /></button>
                                        )}
                                        {user.status === 'active' && !isMainAdmin && !isCurrentUser && (
                                            <button onClick={() => handleUpdateStatus(user, 'inactive')} title="Inativar Usuário" className="text-yellow-400 hover:text-yellow-300"><NoSymbolIcon className="h-6 w-6" /></button>
                                        )}
                                        {user.status === 'inactive' && (
                                            <button onClick={() => handleUpdateStatus(user, 'active')} title="Reativar Usuário" className="text-green-400 hover:text-green-300"><UserPlusIcon className="h-6 w-6" /></button>
                                        )}
                                        {!isMainAdmin && (
                                            <button onClick={() => handleDelete(user._id)} title="Excluir Usuário" className="text-red-500 hover:text-red-400"><TrashIcon className="h-6 w-6" /></button>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                     ) : (
                         <p className="text-center py-8 text-gray-400">Nenhum usuário encontrado.</p>
                     )}
                 </div>
            </div>
        </ContentCard>
        {selectedUser && (
             <UserUnitsModal
                isOpen={isUnitsModalOpen}
                onClose={handleCloseUnitsModal}
                onSave={handleSaveUnits}
                user={selectedUser}
                allUnits={allUnits}
            />
        )}
        </>
    );
};

export default UserManagement;