import React from 'react';

interface HeaderActionButtonProps {
    label: string;
    onClick: () => void;
}

const HeaderActionButton: React.FC<HeaderActionButtonProps> = ({ label, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="group relative px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl 
                     text-sm sm:text-base text-custom-primary dark:text-dark-primary font-medium 
                     hover:bg-gray-100/80 dark:hover:bg-gray-700/50 
                     border border-transparent hover:border-gray-200/40 dark:hover:border-gray-600/40
                     transition-all duration-200 ease-in-out
                     hover:shadow-sm hover:scale-[1.02]
                     active:scale-[0.98]"
        >
            <span className="relative z-10">{label}</span>
            <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-custom-secondary/5 to-custom-third/5 
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        </button>
    );
};

export default HeaderActionButton;