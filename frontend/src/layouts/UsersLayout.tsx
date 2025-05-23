import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

interface UsersLayoutProps {
  children: React.ReactNode;
}

const UsersLayout: React.FC<UsersLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();

  const handleLogout = () => {
    // Handle logout logic here
    navigate('/login');
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen bg-custom-background dark:bg-dark-background">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-dark-input shadow-md">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-custom-secondary dark:text-dark-third">
              DISCON Specialists
            </h2>
          </div>
          <nav className="mt-4">
            <ul>
              <li>
                <a 
                  href="#" 
                  className="block px-4 py-2 text-custom-primary dark:text-dark-primary hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/dashboard');
                  }}
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="block px-4 py-2 text-custom-primary dark:text-dark-primary bg-gray-100 dark:bg-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/users');
                  }}
                >
                  Users
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="block px-4 py-2 text-custom-primary dark:text-dark-primary hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/settings');
                  }}
                >
                  Settings
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white dark:bg-dark-input shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <h1 className="text-lg font-semibold text-custom-primary dark:text-dark-primary">
                Admin Dashboard
              </h1>
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-full text-custom-primary dark:text-dark-primary hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {darkMode ? '🌙' : '☀️'}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 rounded text-custom-primary dark:text-dark-primary hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default UsersLayout;