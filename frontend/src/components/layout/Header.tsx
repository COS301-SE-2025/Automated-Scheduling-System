import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
    pageTitle: string;
    children?: React.ReactNode;
    sidebarCollapsed?: boolean;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, children }) => {
    const { logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Logout failed:", error);

        }
    };

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
                    {children} {/* Render any additional children passed in */}
                    <button
                        onClick={handleLogout}
                        className="group relative px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl 
                                 text-sm sm:text-base text-custom-primary dark:text-dark-primary font-medium 
                                 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 
                                 border border-transparent hover:border-gray-200/40 dark:hover:border-gray-600/40
                                 transition-all duration-200 ease-in-out
                                 hover:shadow-sm hover:scale-[1.02]
                                 active:scale-[0.98]"
                    >
                        <span className="relative z-10">Logout</span>
                        <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-custom-secondary/5 to-custom-third/5 
                                      opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;