import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

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
    const inputRef = useRef<HTMLInputElement>(null);
    const { darkMode } = useTheme();

    useEffect(() => {
        if (inputRef.current) {
            const styleEl = document.createElement('style');
            const inputId = `#${id}`;
            
            const boxShadowColor = darkMode ? '#3b3b3b' : '#f9fafb';
            const textColor = darkMode ? 'white' : '#111827';
            const caretColor = darkMode ? 'white' : '#111827';
            
            styleEl.innerHTML = `
                ${inputId}:-webkit-autofill,
                ${inputId}:-webkit-autofill:hover,
                ${inputId}:-webkit-autofill:focus,
                ${inputId}:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 30px ${boxShadowColor} inset !important;
                    -webkit-text-fill-color: ${textColor} !important;
                    transition: background-color 5000s ease-in-out 0s;
                    caret-color: ${caretColor};
                }
            `;
            
            document.head.appendChild(styleEl);
            
            return () => {
                document.head.removeChild(styleEl);
            };
        }
    }, [id, darkMode]); 

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-custom-primary dark:text-dark-secondary">
                {label}
            </label>
            <div className="mt-1">
                <input
                    ref={inputRef}
                    id={id}
                    name={name}
                    type={type}
                    autoComplete={autoComplete}
                    required={required}
                    value={value}
                    onChange={onChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-custom-secondary focus:border-custom-secondary sm:text-sm text-gray-900 dark:text-white dark:bg-dark-input dark:border-gray-600"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};

export default FormInput;