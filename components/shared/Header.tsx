import React from 'react';

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
}> = ({ label, page, currentPage, onNavigate }) => (
    <button
        onClick={() => onNavigate(page)}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            currentPage === page
            ? 'bg-gray-900 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
    >
        {label}
    </button>
);


const Header: React.FC<HeaderProps> = ({ onLogout, userName, onNavigate, currentPage }) => (
  <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-20 shadow-md">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center space-x-8">
            <div className="flex items-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"/><path d="m13 12-2 5h4l-2 5"/><path d="M9 12a3 3 0 0 0 6 0c0-1.7-3-3-3-3s-3 1.3-3 3Z"/></svg>
                <h1 className="text-xl font-bold ml-2 hidden sm:block">Gestor de Energia</h1>
            </div>
            <nav className="flex space-x-4">
               <NavButton label="Dashboard" page="dashboard" currentPage={currentPage} onNavigate={onNavigate} />
               <NavButton label="Configurações" page="settings" currentPage={currentPage} onNavigate={onNavigate} />
            </nav>
        </div>
        <div className="flex items-center space-x-4">
            <span className="text-gray-300 hidden md:block">Olá, {userName}</span>
            <button onClick={onLogout} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                Sair
            </button>
        </div>
      </div>
    </div>
  </header>
);

export default Header;
