import React from 'react';

interface SelectOption {
    value: string;
    label: string;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    id: string;
    error?: string;
    options: SelectOption[];
}

const FormSelect: React.FC<FormSelectProps> = ({
    label,
    id,
    options,
    error,
    className,
    ...props
}) => {
    const baseSelectClasses = "block w-full rounded-md border-0 py-2 px-3 text-custom-text dark:text-dark-text bg-custom-background dark:bg-dark-input placeholder:text-custom-placeholder dark:placeholder-dark-placeholder shadow-sm ring-1 ring-inset ring-custom-border dark:ring-dark-border focus:ring-2 focus:ring-inset focus:ring-custom-primary dark:focus:ring-dark-primary sm:text-sm sm:leading-6";
    const errorSelectClasses = "ring-red-500 dark:ring-red-500 focus:ring-red-500 dark:focus:ring-red-500";

    return (
        <div className="mb-4">
            <label htmlFor={id} className="block text-sm font-medium leading-6 text-custom-text dark:text-dark-text">
                {label}
            </label>
            <div className="mt-1">
                <select
                    id={id}
                    className={`${baseSelectClasses} ${error ? errorSelectClasses : ''} ${className || ''}`}
                    {...props}
                >
                    {options.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
};

export default FormSelect;