import React from 'react';

interface FeatureGridProps {
    children: React.ReactNode;
    className?: string;
}

const FeatureGrid: React.FC<FeatureGridProps> = ({ children, className = '' }) => {
    return (
        <div className={`
            grid grid-cols-1 gap-6 
            md:grid-cols-2 
            lg:gap-8
            ${className}
        `}>
            {children}
        </div>
    );
};

export default FeatureGrid;