import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpIconProps {
    text: string;
}

const HelpIcon: React.FC<HelpIconProps> = ({ text }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="relative inline-flex items-center"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                className="p-3 flex items-center justify-center rounded-full text-white shadow-sm transition-transform duration-200 focus:outline-none bg-gradient-to-br from-custom-secondary to-custom-third hover:from-custom-third hover:to-custom-secondary"
                aria-label="Help"
            >
                <HelpCircle size={24} />
            </button>

            {isHovered && (
        <div
            className="
        absolute 
        top-full            
        right-0            
        mt-3
        w-max max-w-xs      
        px-4 py-2 
        bg-gray-800 
        dark:bg-gray-700 
        text-white 
        text-sm 
        font-semibold
        rounded-md 
        shadow-lg 
        z-50
        transition-opacity 
        duration-300
        opacity-100
        whitespace-normal break-words text-left
      "
        >
                    {text}
                    <div
            className="absolute right-3 -top-2 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-gray-800 dark:border-b-gray-700"
                    ></div>
                </div>
            )}
        </div>
    );
};

export default HelpIcon;