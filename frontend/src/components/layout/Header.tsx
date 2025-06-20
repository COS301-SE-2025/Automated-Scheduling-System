import React from 'react';
import HeaderActionButton from '../ui/HeaderActionButton';

export interface HeaderAction {
    label: string;
    onClick: () => void;
}

interface HeaderProps {
    pageTitle: string;
    children?: React.ReactNode;
    actions?: HeaderAction[];   
}

const Header: React.FC<HeaderProps> = ({ pageTitle, children, actions = [] }) => {
    return (
        <header className="bg-white/80 dark:bg-dark-input/80 backdrop-blur-md border-b border-gray-200/20 dark:border-gray-700/30 sticky top-0 z-30">
            <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6 flex justify-between items-center">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-custom-secondary to-custom-third rounded-full flex-shrink-0"></div>
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-custom-primary dark:text-dark-primary tracking-tight truncate">
                        {pageTitle}
                    </h1>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6 flex-shrink-0">
                    {children}
                    {actions.map((action) => (
                        <HeaderActionButton
                            key={action.label}
                            label={action.label}
                            onClick={action.onClick}
                        />
                    ))}
                </div>
            </div>
        </header>
    );
};

export default Header;