import React, { useState, useEffect, useCallback, useContext } from 'react';
import { api } from '../../services/api';
import type { User, Unit, Contract, Competence } from '../../types';
import ProfileSettings from './ProfileSettings';
import UnitManagement from './UnitManagement';
import ContractManagement from './ContractManagement';
import CompetenceManagement from './CompetenceManagement';
import UserManagement from './UserManagement';
import AuditLogScreen from './AuditLogScreen';
import { AuthContext } from '../../contexts/AuthContext';
import { UserCircleIcon, UsersIcon, BuildingLibraryIcon, DocumentTextIcon, CalendarDaysIcon, CommandLineIcon } from '@heroicons/react/24/outline';

type SettingsTab = 'profile' | 'users' | 'units' | 'contracts' | 'competences' | 'logs';

const TabButton: React.FC<{ label: string, tab: SettingsTab, activeTab: SettingsTab, onClick: (tab: SettingsTab) => void, icon: React.ReactNode }> = 
({ label, tab, activeTab, onClick, icon }) => (
    <button
        onClick={() => onClick(tab)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
    >
        {icon}
        {label}
    </button>
);


const SettingsScreen: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [users, setUsers] = useState<User[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [competences, setCompetences] = useState<Competence[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (user?.role === 'admin') {
                const [usersData, unitsData, contractsData, competencesData] = await Promise.all([
                    api.getUsers(),
                    api.getAllUnits(), // For admin, this gets all units
                    api.getContracts(),
                    api.getCompetences(),
                ]);
                setUsers(usersData);
                setUnits(unitsData);
                setContracts(contractsData);
                setCompetences(competencesData.sort((a, b) => b.ano - a.ano || b.mes - a.mes));
            }
        } catch (error) {
            console.error("Failed to load settings data", error);
        } finally {
            setLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        // Only load data if the active tab requires it and user is an admin
        if (user?.role === 'admin' && ['users', 'units', 'contracts', 'competences'].includes(activeTab)) {
            loadData();
        } else {
            setLoading(false);
        }
    }, [loadData, activeTab, user?.role]);


    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-white">Configurações</h1>

            <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-2 md:space-x-4 overflow-x-auto pb-2" aria-label="Tabs">
                    <TabButton label="Meu Perfil" tab="profile" activeTab={activeTab} onClick={setActiveTab} icon={<UserCircleIcon className="h-5 w-5" />} />
                    {user?.role === 'admin' && (
                        <>
                            <TabButton label="Usuários" tab="users" activeTab={activeTab} onClick={setActiveTab} icon={<UsersIcon className="h-5 w-5" />} />
                            <TabButton label="Unidades" tab="units" activeTab={activeTab} onClick={setActiveTab} icon={<BuildingLibraryIcon className="h-5 w-5" />} />
                            <TabButton label="Contratos" tab="contracts" activeTab={activeTab} onClick={setActiveTab} icon={<DocumentTextIcon className="h-5 w-5" />} />
                            <TabButton label="Competências" tab="competences" activeTab={activeTab} onClick={setActiveTab} icon={<CalendarDaysIcon className="h-5 w-5" />} />
                            <TabButton label="Logs" tab="logs" activeTab={activeTab} onClick={setActiveTab} icon={<CommandLineIcon className="h-5 w-5" />} />
                        </>
                    )}
                </nav>
            </div>
            
            <div className="mt-6">
                {activeTab === 'profile' && <ProfileSettings />}
                {user?.role === 'admin' && (
                    <>
                        {activeTab === 'users' && <UserManagement users={users} allUnits={units} reloadData={loadData} loading={loading} />}
                        {activeTab === 'units' && <UnitManagement units={units} contracts={contracts} reloadData={loadData} loading={loading} />}
                        {activeTab === 'contracts' && <ContractManagement contracts={contracts} reloadData={loadData} loading={loading} />}
                        {activeTab === 'competences' && <CompetenceManagement competences={competences} reloadData={loadData} loading={loading} />}
                        {activeTab === 'logs' && <AuditLogScreen />}
                    </>
                )}
            </div>

        </div>
    );
};

export default SettingsScreen;