
import React from 'react';

interface ContentCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

const ContentCard: React.FC<ContentCardProps> = ({ title, children, className = '' }) => {
    return (
        <div className={`rounded-lg bg-gray-800 shadow-lg ${className}`}>
            <h3 className="text-lg font-semibold text-white mb-4 px-4 sm:px-6 pt-5">{title}</h3>
            <div className="overflow-x-auto">
                {children}
            </div>
        </div>
    );
};

export default ContentCard;
