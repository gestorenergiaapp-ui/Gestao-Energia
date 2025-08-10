import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import type { ChartData } from '../../types';

interface HorizontalRankChartProps {
    data: ChartData[];
    onBarClick?: (data: any) => void;
}

const HorizontalRankChart: React.FC<HorizontalRankChartProps> = ({ data, onBarClick }) => {
    // Sort data descending by value for ranking
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    const formatCurrency = (value: number) => {
        if (value >= 1000) {
            return `R$${(value / 1000).toFixed(1)}k`;
        }
        return `R$${value.toFixed(2)}`;
    }

    return (
        <ResponsiveContainer width="100%" height={Math.max(300, sortedData.length * 40)}>
            <BarChart
                layout="vertical"
                data={sortedData}
                margin={{
                    top: 5,
                    right: 50,
                    left: 20,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={150} // Allocate space for labels
                    stroke="#A0AEC0" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ dx: -10 }} // Adjust tick position
                    interval={0}
                />
                <Tooltip 
                    cursor={{fill: '#4A5568', opacity: 0.6}}
                    contentStyle={{ backgroundColor: '#2D3748', border: 'none', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#E2E8F0' }}
                    formatter={(value: number, name: string) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Valor']}
                />
                <Bar 
                    dataKey="value" 
                    fill="#3B82F6" 
                    radius={[0, 4, 4, 0]} 
                    barSize={25}
                    onClick={onBarClick}
                    cursor={onBarClick ? "pointer" : "default"}
                >
                    <LabelList 
                        dataKey="value" 
                        position="right" 
                        offset={10}
                        fill="#E2E8F0" 
                        fontSize={12} 
                        formatter={formatCurrency} 
                    />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default HorizontalRankChart;