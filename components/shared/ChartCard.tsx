
import React from 'react';

interface ChartCardProps {
    title: string;
    children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children }) => {
    return (
        <div className="rounded-lg bg-gray-800 p-4 shadow-lg sm:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
            <div className="h-72 w-full">
                {children}
            </div>
        </div>
    );
};

export default ChartCard;
