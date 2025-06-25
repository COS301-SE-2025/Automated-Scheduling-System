import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpIconProps {
    text: string;
}

const HelpIcon: React.FC<HelpIconProps> = ({ text }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="relative flex items-center"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                className="p-3 rounded-full bg-blue-600 dark:bg-blue-500 text-white shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none"
                aria-label="Help"
            >
                <HelpCircle size={24} />
            </button>

            {isHovered && (
                <div
                    className="
            absolute 
            bottom-full         
            left-1/2            
            -translate-x-1/2    
            mb-3
            w-max max-w-xs      
            px-4 py-2 
            bg-gray-800 
            dark:bg-gray-700 
            text-white 
            text-sm 
            font-semibold
            rounded-md 
            shadow-lg 
            z-10
            transition-opacity 
            duration-300
            opacity-100
          "
                >
                    {text}
                    <div
                        className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-800 dark:border-t-gray-700"
                    ></div>
                </div>
            )}
        </div>
    );
};

export default HelpIcon;