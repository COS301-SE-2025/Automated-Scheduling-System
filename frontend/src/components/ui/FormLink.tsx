import React from 'react';
import { Link } from 'react-router-dom';

interface FormLinkProps {
    to: string;
    children: React.ReactNode;
    onClick?: () => void;
}

const FormLink: React.FC<FormLinkProps> = ({ to, children, onClick }) => {
    return (
        <Link to={to} onClick={onClick} className="font-medium text-custom-secondary dark:text-dark-third hover:text-custom-third hover:underline">
            {children}
        </Link>
    );
};

export default FormLink;