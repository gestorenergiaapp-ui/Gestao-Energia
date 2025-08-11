import React, { useState } from 'react';
import type { User } from '@/types';
import ProfileSettings from './ProfileSettings';
import UnitManagement from './UnitManagement';
import ContractManagement from './ContractManagement';
import CompetenceManagement from './CompetenceManagement';
import UserManagement from './UserManagement';
import AuditLogScreen from './AuditLogScreen';
import { useAuth } from '@/hooks/useAuth';
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
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    const renderContent = () => {
        switch(activeTab) {
            case 'profile':
                return <ProfileSettings />;
            case 'users':
                 return user?.role === 'admin' ? <UserManagement /> : null;
            case 'units':
                return user?.role === 'admin' ? <UnitManagement /> : null;
            case 'contracts':
                return user?.role === 'admin' ? <ContractManagement /> : null;
            case 'competences':
                return user?.role === 'admin' ? <CompetenceManagement /> : null;
            case 'logs':
                return user?.role === 'admin' ? <AuditLogScreen /> : null;
            default:
                return <ProfileSettings />;
        }
    }

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
            
            <div className="mt-6" key={activeTab}>
                {renderContent()}
            </div>

        </div>
    );
};

export default SettingsScreen;