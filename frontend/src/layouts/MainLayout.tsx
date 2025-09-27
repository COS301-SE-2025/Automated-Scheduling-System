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
    HelpCircle,
    Shield,
    User,
    TrendingUp
} from 'lucide-react';


const baseNavItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/calendar', label: 'Calendar', icon: <Calendar size={20} /> },
    { path: '/events', label: 'Events', icon: <ListChecks size={20} /> },
    { path: '/event-definitions', label: 'Event Definitions', icon: <FileText size={20} /> },
    { path: '/rules', label: 'Rules', icon: <Gavel size={20} /> },
    { path: '/competencies', label: 'Competencies', icon: <GraduationCap size={20} /> },
    { path: '/admin/compliance', label: 'Compliance Dashboard', icon: <TrendingUp size={20} /> },
    { path: '/users', label: 'Users', icon: <Users size={20} /> },
    { path: '/roles', label: 'Roles', icon: <Shield size={20} /> },
    { path: '/profile', label: 'My Profile', icon: <User size={20} /> },
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
            // Derive a permission key from the path. By default use the first segment
            // For special routes like '/admin/compliance' map to 'compliance dashboard'
            const segments = item.path.replace(/^\//, '').split('/').filter(Boolean);
            let key = segments[0] || 'dashboard';
            if (item.path === '/admin/compliance') key = 'compliance dashboard';

            if (key === 'dashboard' || key === 'main-help' || key === 'profile') return true; 
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
        'dashboard': 'Overview of your workspace, upcoming events, and competency status.',
        'calendar': 'View and manage scheduled events in a calendar view.',
        'events': 'Browse, create, and update scheduled events.',
        'my profile': 'Review your competency status and personal information.',
        'users': 'Manage user accounts, view details, and update roles and access.',
        'compliance dashboard': 'Monitor company-wide competency compliance metrics and trends.',
        'competencies': 'Manage competency requirements and job position mappings.',
        'roles': 'Create and edit roles and permissions to control page access.',
        'event definitions': 'Define reusable event templates and settings.',
        'rules': 'Centralize and maintain organizational rules and policies.',
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