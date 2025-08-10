
import React from 'react';

interface KPIProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

const KPI: React.FC<KPIProps> = ({ title, value, icon }) => {
  return (
    <div className="relative flex items-center gap-4 overflow-hidden rounded-lg bg-gray-800 p-4 shadow sm:p-5">
      <div className="flex-shrink-0 h-14 w-14 flex items-center justify-center bg-indigo-900/50 text-indigo-400 rounded-lg">
        {icon}
      </div>
      <div>
        <dt className="truncate text-sm font-medium text-gray-400">{title}</dt>
        <dd className="mt-1 text-2xl font-semibold tracking-tight text-white">{value}</dd>
      </div>
    </div>
  );
};

export default KPI;