import React from 'react';

interface FormContainerProps {
    onSubmit: (event: React.FormEvent) => void;
    children: React.ReactNode;
}

const FormContainer: React.FC<FormContainerProps> = ({ onSubmit, children }) => {
    return (
        <form onSubmit={onSubmit} className="space-y-6 p-8 bg-white shadow-xl rounded-lg w-full max-w-md">
            {children}
        </form>
    );
};

export default FormContainer;