import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import NotFoundPage from '../pages/NotFoundPage';
import UsersPage from '../pages/UsersPage';
import DashboardPage from '../pages/DashboardPage';
import CalendarPage from '../pages/CalendarPage';
import CompetencyPage from '../pages/CompetencyPage';
import EventsPage from '../pages/EventsPage';
import RulesPage from '../pages/RulesPage';
import RolesPage from '../pages/RolesPage';
import LandingPage from '../pages/LandingPage';
import LandingHelpPage from '../pages/LandingHelpPage';
import MainHelpPage from '../pages/MainHelpPage';
import EventDefinitionsPage from '../pages/EventDefinitionsPage';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../services/api';
import { useEffect, useState } from 'react';

const ProtectedRouteElement: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen"><div>Loading...</div></div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

const PublicAuthRouteElement: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen"><div>Loading...</div></div>;
    }
    
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
}

const RootRedirector: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
      return <div className="flex justify-center items-center min-h-screen"><div>Loading...</div></div>;
    }
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

const PageGuard: React.FC<{ page: string }> = ({ page }) => {
    const { isLoading } = useAuth();
    const [allowed, setAllowed] = useState<boolean | null>(null);
    useEffect(() => {
        let cancelled = false;
        async function check() {
            try {
                const perms = await apiClient<string[]>('api/roles/permissions', { method: 'GET' });
                if (!cancelled) setAllowed(perms.includes(page));
            } catch {
                if (!cancelled) setAllowed(false);
            }
        }
        check();
        return () => { cancelled = true; };
    }, [page]);

    if (isLoading || allowed === null) {
        return <div className="flex justify-center items-center min-h-screen"><div>Verifying permissions...</div></div>;
    }
    return allowed ? <Outlet /> : <Navigate to="/404" replace />;
};

const AppRoutes: React.FC = () => {
    const { isLoading: authIsLoading } = useAuth();

    if (authIsLoading) {
         return <div className="flex justify-center items-center min-h-screen"><div>Initializing Application...</div></div>;
    }

    return (
        <Routes>
            {/* Public routes */}
            <Route element={<PublicAuthRouteElement />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:resetToken" element={<ResetPasswordPage />} />
                <Route path="/landing-help" element={<LandingHelpPage />} />
            </Route>

            {/* Protected Routes */}
            <Route element={<ProtectedRouteElement />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                {/* <Route path="/users" element={<UsersPage />} /> */}
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/rules" element={<RulesPage />} />
                <Route path="/main-help" element={<MainHelpPage />} />
            </Route>

            <Route element={<ProtectedRouteElement />}>
                <Route element={<PageGuard page="users" />}>
                    <Route path="/users" element={<UsersPage />} />
                </Route>
                <Route element={<PageGuard page="roles" />}>
                    <Route path="/roles" element={<RolesPage />} />
                </Route>
                <Route element={<PageGuard page="competencies" />}>
                    <Route path="/competencies" element={<CompetencyPage />} />
                </Route>
                <Route element={<PageGuard page="event-definitions" />}>
                    <Route path="/event-definitions" element={<EventDefinitionsPage />} />
                </Route>
            </Route>
            
            {/* Default route handler */}
            <Route path="/" element={<RootRedirector />} />

            {/* Catch-all for 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

export default AppRoutes;