import React from 'react';
// import { useAuth } from '../hooks/useAuth'; // If layout needs auth data directly

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  // const { user, logout } = useAuth(); // Example: if Navbar needs user/logout

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page content will be rendered here */}
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;