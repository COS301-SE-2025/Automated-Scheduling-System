import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpIconProps {
    text: string;
    placement?: 'above' | 'below';
    align?: 'left' | 'right' | 'center';
}

const HelpIcon: React.FC<HelpIconProps> = ({ text, placement = 'below', align = 'right' }) => {
    const [isHovered, setIsHovered] = useState(false);

    const posClasses = placement === 'below'
        ? 'absolute top-full mt-3'
        : 'absolute bottom-full mb-3';

    const alignClasses = align === 'left' ? 'left-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-0';

    const arrowPos = align === 'center' ? 'left-1/2 -translate-x-1/2' : align === 'left' ? 'left-3' : 'right-3';
    const arrowOrientation = placement === 'below'
        ? '-top-2 border-b-8 border-b-gray-800 dark:border-b-gray-700'
        : '-bottom-2 border-t-8 border-t-gray-800 dark:border-t-gray-700';
    const arrowClasses = `absolute ${arrowPos} w-0 h-0 border-x-8 border-x-transparent ${arrowOrientation}`;

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
            className={`
        ${posClasses}
        ${alignClasses}
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
      `}
        >
                    {text}
                    <div className={arrowClasses}></div>
                </div>
            )}
        </div>
    );
};

export default HelpIcon;