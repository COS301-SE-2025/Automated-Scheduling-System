import React from 'react';
import Layout from './Layout';
import { type NavItem } from '../components/layout/Sidebar';
import { type HeaderAction } from '../components/layout/Header';
import { useNavigate } from 'react-router-dom';

const navItems: NavItem[] = [
    { path: '/', label: 'Welcome' },
    { path: '/landing-help', label: 'Help' }
];

interface LandingLayoutProps {
    children: React.ReactNode;
}

const LandingLayout: React.FC<LandingLayoutProps> = ({ children }) => {
    const navigate = useNavigate();

    const headerActions: HeaderAction[] = [
        { label: 'Login', onClick: () => navigate('/login') },
        { label: 'Sign Up', onClick: () => navigate('/signup') },
    ];

    return (
        <Layout
            pageTitle="Welcome"
            navItems={navItems}
            companyName="DISCON Specialists"
            headerActions={headerActions}
        >
            {children}
        </Layout>
    );
};

export default LandingLayout;