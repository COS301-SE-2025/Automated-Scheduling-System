import React from 'react';

interface FeatureBlockProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

const FeatureBlock: React.FC<FeatureBlockProps> = ({ title, icon, children, className = '' }) => {
    return (
        <div className={`
      rounded-xl bg-gradient-to-br from-custom-secondary to-custom-third 
      p-[2px] shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]
      ${className}
    `}>
            <div className="flex h-full w-full flex-col rounded-[10px] bg-white dark:bg-dark-div p-4 sm:p-6">

                <div className="mb-4 flex items-center space-x-3">
                    {icon && (
                        <div className="flex-shrink-0 text-custom-secondary dark:text-light-accent">
                            {icon}
                        </div>
                    )}
                    <h3 className="text-lg font-bold text-custom-primary dark:text-dark-primary tracking-tight">
                        {title}
                    </h3>
                </div>

                <div className="text-sm text-custom-text dark:text-dark-secondary">
                    {children}
                </div>

            </div>
        </div>
    );
};

export default FeatureBlock;