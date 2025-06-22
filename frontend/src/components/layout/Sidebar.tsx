import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; 

export interface NavItem {
    path: string;
    label: string;
    icon?: React.ReactNode;
}

interface SidebarProps {
    navItems: NavItem[];
    companyName?: string;
    isCollapsed: boolean;
    onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    navItems,
    companyName = "DISCON Specialists",
    isCollapsed,
    onToggle,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // This state is for presentation logic purely within the sidebar (e.g., mobile overlay)
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            if (typeof window !== 'undefined') {
                setIsMobile(window.innerWidth < 768);
            }
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    const sidebarWidth = isCollapsed ? 'w-16' : 'w-56 sm:w-60 lg:w-64';

    return (
        <>
            {isMobile && !isCollapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={onToggle} // Use the passed-in toggle handler
                />
            )}

            <div className={`${sidebarWidth} bg-white/90 dark:bg-dark-input/90 backdrop-blur-sm shadow-xl flex-shrink-0 border-r border-gray-200/30 dark:border-gray-700/30 
                            ${isMobile ? 'fixed' : 'relative'} inset-y-0 left-0 z-40 
                            transform transition-all duration-300 ease-in-out
                            translate-x-0 
                            flex flex-col h-full`}>

                {/* Company Header */}
                <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-200/40 dark:border-gray-700/40 bg-gradient-to-br from-custom-fourth/30 to-transparent dark:from-dark-signin/20 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        {!isCollapsed ? (
                            <div className="flex items-center min-w-0 flex-1">
                                <img 
                                    src="/Discon_Logo.png" 
                                    alt="DISCON Logo" 
                                    className="h-8 w-auto mr-3 flex-shrink-0" 
                                />
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-custom-primary dark:text-dark-primary tracking-tight truncate">
                                        {companyName.split(' ')[0]}
                                    </h2>
                                    {companyName.split(' ').length > 1 && (
                                        <p className="text-xs sm:text-sm text-custom-secondary dark:text-dark-secondary font-medium truncate">
                                            {companyName.split(' ').slice(1).join(' ')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center w-full">
                                <img 
                                    src="/Discon_Logo.png" 
                                    alt="DISCON Logo" 
                                    className="h-8 w-auto" 
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="mt-4 sm:mt-6 px-3 sm:px-4 overflow-y-auto flex-1">
                    <ul className="space-y-1 sm:space-y-2">
                        {navItems.map((item) => {
                            if (item.label.toLowerCase() == "users" && user?.role !== "Admin"){
                                return null;
                            }
                            const isActive = location.pathname === item.path ||
                                (item.path !== '/' && location.pathname.startsWith(item.path + '/'));

                            return (
                                <li key={item.path}>
                                    <a
                                        href={item.path}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigate(item.path);
                                            if (isMobile) {
                                                onToggle(); // Use the passed-in toggle handler
                                            }
                                        }}
                                        className={`group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3 sm:px-4'} py-2.5 sm:py-3 lg:py-3.5 rounded-lg sm:rounded-xl 
                                                   text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out
                                            ${isActive
                                                ? 'bg-gradient-to-r from-custom-secondary/10 to-custom-third/5 text-custom-primary dark:text-dark-primary border border-custom-secondary/20 dark:border-dark-secondary/20 shadow-sm'
                                                : 'text-custom-primary/70 dark:text-dark-primary/70 hover:text-custom-primary dark:hover:text-dark-primary hover:bg-gray-100/60 dark:hover:bg-gray-700/30 hover:scale-[1.02]'
                                            }`}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 sm:w-1 h-6 sm:h-8 bg-gradient-to-b from-custom-secondary to-custom-third rounded-r-full"></div>
                                        )}

                                        <div className={`${isCollapsed ? 'w-3 h-3' : 'w-1.5 sm:w-2 h-1.5 sm:h-2'} rounded-full ${isCollapsed ? '' : 'mr-2 sm:mr-3'} flex-shrink-0 transition-all duration-200
                                            ${isActive
                                                ? 'bg-custom-secondary shadow-sm'
                                                : 'bg-gray-400/60 dark:bg-gray-500/60 group-hover:bg-custom-secondary/60'
                                            }`}>
                                        </div>

                                        {!isCollapsed && (
                                            <span className="relative z-10 truncate">{item.label}</span>
                                        )}

                                        {!isActive && (
                                            <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-custom-secondary/5 to-custom-third/5 
                                                          opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                        )}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Bottom Toggle Button Section */}
                <div className={`mt-auto p-3 sm:p-4 border-t border-gray-200/40 dark:border-gray-700/40 flex-shrink-0
                                ${isCollapsed ? 'flex justify-center' : 'flex justify-end'}`}>
                    <button
                        onClick={onToggle} // Use the passed-in toggle handler
                        className={`p-2 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-700/30 text-custom-primary dark:text-dark-primary transition-all duration-200 flex-shrink-0`}
                        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <svg
                            className={`w-5 h-5 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;