
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { BarChartData } from '../../types';

interface ExpensesBarChartProps {
    data: BarChartData[];
    dataKey?: string;
}

const ExpensesBarChart: React.FC<ExpensesBarChartProps> = ({ data, dataKey = "Valor (R$)" }) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{
                    top: 5,
                    right: 20,
                    left: 40,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis dataKey="name" stroke="#A0AEC0" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#A0AEC0" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => typeof value === 'number' ? `R$${(value/1000)}k` : ''}/>
                <Tooltip 
                    cursor={{fill: '#4A5568', opacity: 0.6}}
                    contentStyle={{ backgroundColor: '#2D3748', border: 'none', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#E2E8F0' }}
                    formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), dataKey]}
                />
                <Legend wrapperStyle={{fontSize: "12px"}}/>
                <Bar dataKey={dataKey} fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default ExpensesBarChart;
