import React from 'react';

interface FormInputProps {
    id: string;
    name: string;
    type: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    autoComplete?: string;
}

const FormInput: React.FC<FormInputProps> = ({
    id,
    name,
    type,
    label,
    value,
    onChange,
    placeholder,
    required = false,
    autoComplete,
}) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-custom-primary">
                {label}
            </label>
            <div className="mt-1">
                <input
                    id={id}
                    name={name}
                    type={type}
                    autoComplete={autoComplete}
                    required={required}
                    value={value}
                    onChange={onChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-custom-secondary focus:border-custom-secondary sm:text-sm text-gray-900"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};

export default FormInput;