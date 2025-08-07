
import React from 'react';

interface KPIProps {
  title: string;
  value: string | number;
}

const KPI: React.FC<KPIProps> = ({ title, value }) => {
  return (
    <div className="overflow-hidden rounded-lg bg-gray-800 px-4 py-5 shadow sm:p-6">
      <dt className="truncate text-sm font-medium text-gray-400">{title}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight text-white">{value}</dd>
    </div>
  );
};

export default KPI;
