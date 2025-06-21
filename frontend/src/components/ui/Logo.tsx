import React from 'react';

interface LogoProps {
    /**
     * The size (width and height) of the logo in pixels.
     * @default 50
     */
    size?: number;
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 50, className = '' }) => {

    const circleSize = '50%';

    return (
        <div
            className={`
                inline-flex items-center justify-center
                rounded-2xl bg-gradient-to-br from-custom-secondary to-custom-third
                shadow-md
                ${className}
            `}
            style={{ width: size, height: size }}
        >
            <div
                className="rounded-full bg-black"
                style={{ width: circleSize, height: circleSize }}
            ></div>
        </div>
    );
};

export default Logo;