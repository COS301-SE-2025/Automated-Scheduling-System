import React from 'react';
import Layout from './Layout';
import { type NavItem } from '../components/layout/Sidebar';

const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/users', label: 'Users' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/events', label: 'Events' },
    { path: '/rules', label: 'Rules' },
    { path: '/settings', label: 'Settings' },
];

interface UsersLayoutProps {
    children: React.ReactNode;
}

const UsersLayout: React.FC<UsersLayoutProps> = ({ children }) => {
    return (
        <Layout
            pageTitle="User List"
            navItems={navItems}
            companyName="DISCON Specialists"
        >
            {children}
        </Layout>
    );
};

export default UsersLayout;