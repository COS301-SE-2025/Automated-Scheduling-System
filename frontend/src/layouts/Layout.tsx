import React, { useState, useEffect } from 'react';
import Header, { type HeaderAction } from '../components/layout/Header';
import Sidebar, { type NavItem } from '../components/layout/Sidebar';

// 1. Move the state initialization logic from Sidebar.tsx to here.
const getInitialSidebarCollapsedState = (): boolean => {
    // Prevent errors during server-side rendering
    if (typeof window === 'undefined') {
        return false;
    }
    const storedState = localStorage.getItem('sidebarCollapsed');
    if (storedState !== null) {
        return JSON.parse(storedState);
    }
    // Default to collapsed on smaller screens
    return window.innerWidth < 768;
};

interface LayoutProps {
    pageTitle: string;
    navItems: NavItem[];
    headerActions?: HeaderAction[];
    companyName?: string;
    children: React.ReactNode;
    headerChildren?: React.ReactNode;
    requirePermissions?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
    pageTitle,
    navItems,
    headerActions,
    companyName,
    children,
    headerChildren,
    requirePermissions = true
}) => {
    // 2. The Layout component now owns the state.
    const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsedState);

    // 3. This effect now lives in the Layout to persist the state.
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
    }, [sidebarCollapsed]);
    
    // 4. The toggle handler simply updates the state here.
    const handleSidebarToggle = () => {
        setSidebarCollapsed(prevCollapsed => !prevCollapsed);
    };

    return (
        <div className="flex h-screen bg-custom-background dark:bg-dark-background">
            <Sidebar
                navItems={navItems}
                companyName={companyName}
                isCollapsed={sidebarCollapsed} 
                onToggle={handleSidebarToggle}  
                requirePermissions={requirePermissions}
            />

            <div className="flex-1 flex flex-col min-w-0">
                <Header
                    pageTitle={pageTitle}
                    actions={headerActions}
                >
                    {headerChildren}
                </Header>

                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;