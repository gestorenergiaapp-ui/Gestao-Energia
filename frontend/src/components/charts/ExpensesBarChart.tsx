import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { BarChartData } from '../../types';

interface ExpensesBarChartProps {
    data: BarChartData[];
    dataKeys: { key: string; color: string; }[];
    onBarClick?: (data: any) => void;
}

const ExpensesBarChart: React.FC<ExpensesBarChartProps> = ({ data, dataKeys, onBarClick }) => {
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
                    formatter={(value: number, name: string) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), name]}
                />
                <Legend wrapperStyle={{fontSize: "12px"}}/>
                {dataKeys.map(dk => (
                    <Bar 
                        key={dk.key} 
                        dataKey={dk.key} 
                        fill={dk.color} 
                        radius={[4, 4, 0, 0]} 
                        onClick={onBarClick}
                        cursor={onBarClick ? 'pointer' : 'default'}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
};

export default ExpensesBarChart;