import React, { useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import { type NavItem } from '../components/layout/Sidebar';
import { type HeaderAction } from '../components/layout/Header';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../services/api';
import HelpIcon from '../components/ui/HelpIcon';
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
    helpText?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, pageTitle, helpText }) => {
    const { logout, user } = useAuth();
    const [allowedPages, setAllowedPages] = useState<string[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!user) { setAllowedPages(null); return; }
            try {
                const perms = await apiClient<string[]>('roles/permissions', { method: 'GET' });
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

    // Provide a sensible default help description based on the page title
    const defaultHelpByTitle: Record<string, string> = {
        'dashboard': 'Overview of your schedules, quick links, and recent activity.',
        'users': 'Manage user accounts, view details, and update roles and access.',
        'roles': 'Create and edit roles and permissions to control page access.',
        'calendar': 'View and manage scheduled events in a calendar view.',
        'event definitions': 'Define reusable event templates and settings.',
        'events': 'Browse, create, and update scheduled events.',
        'rules': 'Centralize and maintain organizational rules and policies.',
        'competencies': 'Manage competency requirements and job position mappings.',
        'main-help': 'Guidance and FAQs about using the system.',
    };
    const effectiveHelpText = helpText ?? defaultHelpByTitle[pageTitle.toLowerCase()];

    return (
        <Layout
            pageTitle={pageTitle}
            navItems={navItems}
            companyName="DISCON Specialists"
            headerActions={headerActions}
            headerChildren={effectiveHelpText ? <HelpIcon text={effectiveHelpText} /> : undefined}
        >
            {children}
        </Layout>
    );
};

export default MainLayout;