import React from 'react';
import Layout from './Layout';
import { type NavItem } from '../components/layout/Sidebar';
import { type HeaderAction } from '../components/layout/Header';
import { useAuth } from '../hooks/useAuth';

const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/users', label: 'Users' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/events', label: 'Events' },
    { path: '/event-definitions', label: 'Event Definitions' },
    { path: '/rules', label: 'Rules' },
    { path: '/competencies', label: 'Competencies' },
    { path: '/main-help', label: 'Help' },
];

interface MainLayoutProps {
    children: React.ReactNode;
    pageTitle: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, pageTitle }) => {
    const { logout } = useAuth();

    const headerActions: HeaderAction[] = [
        {
            label: 'Logout',
            onClick: logout
        }
    ];

    return (
        <Layout
            pageTitle={pageTitle}
            navItems={navItems}
            companyName="DISCON Specialists"
            headerActions={headerActions}
        >
            {children}
        </Layout>
    );
};

export default MainLayout;