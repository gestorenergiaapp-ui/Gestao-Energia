import React from 'react';
import ProfileSettings from './ProfileSettings';
import UnitManagement from './UnitManagement';

const SettingsScreen: React.FC = () => {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-white">Configurações</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <ProfileSettings />
                </div>
                <div className="lg:col-span-2">
                    <UnitManagement />
                </div>
            </div>
        </div>
    );
};

export default SettingsScreen;
