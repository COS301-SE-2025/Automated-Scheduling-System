import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import NotFoundPage from '../pages/NotFoundPage';
import UsersPage from '../pages/UsersPage';
import DashboardPage from '../pages/DashboardPage';
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

const RootRedirector: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
      return <div className="flex justify-center items-center min-h-screen"><div>Loading...</div></div>;
    }
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

const AppRoutes: React.FC = () => {
    const { isLoading: authIsLoading } = useAuth();

    if (authIsLoading) {
         return <div className="flex justify-center items-center min-h-screen"><div>Initializing Application...</div></div>;
    }

    return (
        <Routes>
            {/* Public routs */}
            <Route element={<PublicAuthRouteElement />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Protected Routes */}
            <Route element={<ProtectedRouteElement />}>
                {/* Example using DashboardLayout */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/users" element={<UsersPage />} />
            </Route>
            
            {/* Default route handler */}
            <Route path="/" element={<RootRedirector />} />

            {/* Catch-all for 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

export default AppRoutes;