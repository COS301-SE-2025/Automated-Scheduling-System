import React from 'react';
import Layout from './Layout';
import { type NavItem } from '../components/layout/Sidebar';
import { type HeaderAction } from '../components/layout/Header';
import { useAuth } from '../hooks/useAuth';
import {
    LayoutDashboard,
    Users,
    Calendar,
    ListChecks,
    FileText,
    Gavel,
    GraduationCap,
    HelpCircle
} from 'lucide-react';


const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/users', label: 'Users', icon: <Users size={20} /> },
    { path: '/calendar', label: 'Calendar', icon: <Calendar size={20} /> },
    { path: '/event-definitions', label: 'Event Definitions', icon: <FileText size={20} /> },
    { path: '/events', label: 'Events', icon: <ListChecks size={20} /> },
    { path: '/rules', label: 'Rules', icon: <Gavel size={20} /> },
    { path: '/competencies', label: 'Competencies', icon: <GraduationCap size={20} /> },
    { path: '/main-help', label: 'Help', icon: <HelpCircle size={20} /> },
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