import React from 'react';

interface MessageBoxProps {
    title: string;
    children: React.ReactNode;
    type?: 'error' | 'success' | 'info' | 'warning';
}

const MessageBox: React.FC<MessageBoxProps> = ({ title, children, type = 'info' }) => {
    const getTypeStyles = () => {
        switch (type) {
            case 'error':
                return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200';
            case 'success':
                return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200';
            case 'warning':
                return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
            case 'info':
            default:
                return 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200';
        }
    };

    return (
        <div className={`p-4 mb-4 rounded-lg ${getTypeStyles()}`}>
            <div className="text-center">
                <h3 className="text-lg font-medium">{title}</h3>
                <div className="mt-2 text-sm">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default MessageBox;