import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import NotFoundPage from '../pages/NotFoundPage';
import UsersPage from '../pages/UsersPage';
import DashboardPage from '../pages/DashboardPage';
import CalendarPage from '../pages/CalendarPage';
import EventsPage from '../pages/EventsPage';
import RulesPage from '../pages/RulesPage';
// 1. Import the LandingPage
import LandingPage from '../pages/LandingPage'; 
import { useAuth } from '../hooks/useAuth';

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

// 2. The RootRedirector component is no longer needed and has been removed.

const AppRoutes: React.FC = () => {
    const { isLoading: authIsLoading } = useAuth();

    if (authIsLoading) {
         return <div className="flex justify-center items-center min-h-screen"><div>Initializing Application...</div></div>;
    }

    return (
        <Routes>
            {/* Public routes */}
            <Route element={<PublicAuthRouteElement />}>
                {/* 3. Set the root path '/' to render the LandingPage */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Protected Routes */}
            <Route element={<ProtectedRouteElement />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/rules" element={<RulesPage />} />
            </Route>
            
            {/* 4. The specific route for '/' has been moved into the public routes group. */}

            {/* Catch-all for 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

export default AppRoutes;