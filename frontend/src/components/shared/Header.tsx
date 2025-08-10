import React from 'react';
import { ArrowLeftOnRectangleIcon, Cog6ToothIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import Logo from './Logo';

type Page = 'dashboard' | 'settings';

interface HeaderProps {
    onLogout: () => void;
    userName: string;
    onNavigate: (page: Page) => void;
    currentPage: Page;
}

const NavButton: React.FC<{
    label: string;
    page: Page;
    currentPage: Page;
    onNavigate: (page: Page) => void;
    icon: React.ReactNode;
}> = ({ label, page, currentPage, onNavigate, icon }) => (
    <button
        onClick={() => onNavigate(page)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            currentPage === page
            ? 'bg-gray-900 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
    >
        {icon}
        <span className="hidden md:inline">{label}</span>
    </button>
);


const Header: React.FC<HeaderProps> = ({ onLogout, userName, onNavigate, currentPage }) => (
  <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-20 shadow-md">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center space-x-8">
            <div className="flex items-center flex-shrink-0">
                <Logo className="h-8 w-8 text-indigo-400" />
                <h1 className="text-xl font-bold ml-2 hidden sm:block">Gestor de Energia</h1>
            </div>
            <nav className="flex space-x-4">
               <NavButton label="Dashboard" page="dashboard" currentPage={currentPage} onNavigate={onNavigate} icon={<Squares2X2Icon className="h-5 w-5" />} />
               <NavButton label="Configurações" page="settings" currentPage={currentPage} onNavigate={onNavigate} icon={<Cog6ToothIcon className="h-5 w-5" />} />
            </nav>
        </div>
        <div className="flex items-center space-x-4">
            <span className="text-gray-300 hidden md:block">Olá, {userName}</span>
            <button onClick={onLogout} title="Sair" className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Sair</span>
            </button>
        </div>
      </div>
    </div>
  </header>
);

export default Header;
