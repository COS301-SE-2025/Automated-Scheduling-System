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

interface EventsLayoutProps {
    children: React.ReactNode;
}

const EventsLayout: React.FC<EventsLayoutProps> = ({ children }) => {
    return (
        <Layout
            pageTitle="Events"
            navItems={navItems}
            companyName="DISCON Specialists"
        >
            {children}
        </Layout>
    );
};

export default EventsLayout;