import React, { useState } from 'react';
import Header from '../components/layout/Header';
import Sidebar, { type NavItem } from '../components/layout/Sidebar';

interface LayoutProps {
    pageTitle: string;
    navItems: NavItem[];
    companyName?: string;
    children: React.ReactNode;
    headerChildren?: React.ReactNode; // For theme toggle, etc.
}

const Layout: React.FC<LayoutProps> = ({
    pageTitle,
    navItems,
    companyName,
    children,
    headerChildren
}) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const handleSidebarToggle = (collapsed: boolean) => {
        setSidebarCollapsed(collapsed);
    };

    return (
        <div className="flex h-screen bg-custom-background dark:bg-dark-background">
            {/* Sidebar */}
            <Sidebar 
                navItems={navItems}
                companyName={companyName}
                onToggle={handleSidebarToggle}
            />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <Header 
                    pageTitle={pageTitle}
                    sidebarCollapsed={sidebarCollapsed}
                >
                    {headerChildren}
                </Header>
                
                {/* Page Content */}
                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;