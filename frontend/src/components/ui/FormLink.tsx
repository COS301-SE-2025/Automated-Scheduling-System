import React from 'react';
import { Link } from 'react-router-dom';

interface FormLinkProps {
  to: string;
  children: React.ReactNode;
}

const FormLink: React.FC<FormLinkProps> = ({ to, children }) => {
  return (
    <Link to={to} className="font-medium text-custom-secondary hover:text-custom-third hover:underline">
      {children}
    </Link>
  );
};

export default FormLink;