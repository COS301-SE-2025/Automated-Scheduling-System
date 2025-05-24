import React from 'react';

interface FormButtonProps {
    type?: 'button' | 'submit' | 'reset';
    onClick?: () => void;
    children: React.ReactNode;
    fullWidth?: boolean;
    disabled?: boolean;
}

const FormButton: React.FC<FormButtonProps> = ({
    type = 'submit',
    onClick,
    children,
    fullWidth = true,
    disabled = false,
}) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${fullWidth ? 'w-full' : ''} flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-custom-primary dark:bg-dark-signin hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-secondary transition-colors duration-150 ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
            {children}
        </button>
    );
};

export default FormButton;