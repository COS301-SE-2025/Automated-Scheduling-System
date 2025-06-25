import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    id: string;
    error?: string;
}

const FormInput: React.FC<FormInputProps> = ({
    label,
    id,
    type = 'text',
    error,
    className,
    ...props
}) => {
    const baseInputClasses = "block w-full rounded-md border-0 py-2 px-3 text-custom-text dark:text-dark-text bg-custom-background dark:bg-dark-input placeholder:text-custom-placeholder dark:placeholder-dark-placeholder shadow-sm ring-1 ring-inset ring-custom-border dark:ring-dark-border focus:ring-2 focus:ring-inset focus:ring-custom-primary dark:focus:ring-dark-primary sm:text-sm sm:leading-6";
    const errorInputClasses = "ring-red-500 dark:ring-red-500 focus:ring-red-500 dark:focus:ring-red-500";


    return (
        <div className="mb-4">
            <label htmlFor={id} className="block text-sm font-medium leading-6 text-custom-text dark:text-dark-text">
                {label}
            </label>
            <div className="mt-1">
                <input
                    id={id}
                    type={type}
                    className={`${baseInputClasses} ${error ? errorInputClasses : ''} ${className || ''}`}
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
};

export default FormInput;