import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChartData } from '../../types';

interface ExpensesPieChartProps {
    data: ChartData[];
    onSliceClick?: (data: any) => void;
}

const COLORS = ['#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316']; // Teal, Blue, Violet, Pink, Orange

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't render label for small slices

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const ExpensesPieChart: React.FC<ExpensesPieChartProps> = ({ data, onSliceClick }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Tooltip
                    cursor={{fill: '#4A5568', opacity: 0.6}}
                    contentStyle={{ backgroundColor: '#2D3748', border: 'none', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#E2E8F0' }}
                    formatter={(value: number, name: string) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), name]}
                />
                <Legend 
                    layout={isMobile ? "horizontal" : "vertical"}
                    verticalAlign={isMobile ? "bottom" : "middle"}
                    align={isMobile ? "center" : "right"}
                    wrapperStyle={{fontSize: "12px", color: '#A0AEC0', paddingLeft: isMobile ? 0 : '20px'}}
                    iconSize={10}
                />
                <Pie
                    data={data}
                    cx={isMobile ? "50%" : "40%"}
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={isMobile ? 80 : 100}
                    innerRadius={isMobile ? 40: 50}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    onClick={onSliceClick}
                    cursor={onSliceClick ? "pointer" : "default"}
                    paddingAngle={1}
                >
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            style={{ outline: 'none' }}
                        />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};

export default ExpensesPieChart;