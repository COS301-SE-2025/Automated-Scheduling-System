import React from 'react';

interface MessageBoxProps {
    title: string;
    children: React.ReactNode;
}

const MessageBox: React.FC<MessageBoxProps> = ({ title, children }) => {
    return (
        <div className="p-8 bg-white dark:bg-dark-div shadow-xl rounded-lg w-full max-w-md">
            <div className="text-center">
                <h3 className="text-lg font-medium text-custom-primary dark:text-dark-secondary">{title}</h3>
                <div className="mt-2 text-sm text-custom-third dark:text-dark-third">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default MessageBox;