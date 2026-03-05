import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';

interface DeliveryChartProps {
  metrics: {
    deliveredOnTime: number;
    deliveredLate: number;
    delayed: number;
    deliveryTotal: number;
  };
}

export function DeliveryChart({ metrics }: DeliveryChartProps) {
  const data = [
    { name: 'Entregues no Prazo', value: metrics.deliveredOnTime, color: '#22c55e' }, // green-500
    { name: 'Entregues Fora do Prazo', value: metrics.deliveredLate, color: '#f59e0b' }, // amber-500
    { name: 'Atrasados', value: metrics.delayed, color: '#ef4444' }, // red-500
  ];

  const percentageData = data.map(item => ({
    ...item,
    percentage: metrics.deliveryTotal > 0 ? ((item.value / metrics.deliveryTotal) * 100).toFixed(1) : 0
  }));

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white p-6 animate-in fade-in zoom-in-95 duration-300">
      <h3 className="text-lg font-bold text-gray-800 mb-6 uppercase tracking-wide">Análise de Entregas</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl h-[400px]">
        {/* Gráfico de Pizza */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col items-center">
            <h4 className="text-sm font-semibold text-gray-600 mb-4 uppercase">Distribuição Percentual</h4>
            <div className="w-full h-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={percentageData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
                                const RADIAN = Math.PI / 180;
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                
                                if (percent < 0.05) return null; 

                                return (
                                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold" style={{ fontSize: '11px', fontWeight: 'bold', textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}>
                                        {value} ({`${(percent * 100).toFixed(1)}%`})
                                    </text>
                                );
                            }}
                            labelLine={false}
                        >
                            {percentageData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value: number) => [`${value} pedidos`, 'Quantidade']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Gráfico de Barras */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col items-center">
            <h4 className="text-sm font-semibold text-gray-600 mb-4 uppercase">Quantidade Absoluta</h4>
            <div className="w-full h-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={percentageData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 10}} interval={0} />
                        <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                            <LabelList dataKey="value" position="right" style={{ fill: '#4b5563', fontSize: '12px', fontWeight: 'bold' }} />
                            {percentageData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
}
