import React, { useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import { type NavItem } from '../components/layout/Sidebar';
import { type HeaderAction } from '../components/layout/Header';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../services/api';
import {
    LayoutDashboard,
    Users,
    Calendar,
    ListChecks,
    FileText,
    Gavel,
    GraduationCap,
    HelpCircle
    , Shield
} from 'lucide-react';


const baseNavItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/users', label: 'Users', icon: <Users size={20} /> },
    { path: '/roles', label: 'Roles', icon: <Shield size={20} /> },
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
    const { logout, user } = useAuth();
    const [allowedPages, setAllowedPages] = useState<string[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!user) { setAllowedPages(null); return; }
            try {
                const perms = await apiClient<string[]>('api/roles/permissions', { method: 'GET' });
                if (!cancelled) setAllowedPages(perms);
            } catch {
                if (!cancelled) setAllowedPages([]);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [user]);

    const navItems = useMemo(() => {
        if (!allowedPages) return baseNavItems; 
        return baseNavItems.filter(item => {
            const key = item.path.replace('/', '') || 'dashboard';
            if (key === 'dashboard' || key === 'main-help') return true; 
            return allowedPages.includes(key);
        });
    }, [allowedPages]);

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