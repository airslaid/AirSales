import React from 'react';
import { ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DeliveryTrendData {
  month: string;
  onTime: number;
  late: number;
  delayed: number;
}

interface DeliveryChartProps {
  trendData: DeliveryTrendData[];
}

export function DeliveryChart({ trendData }: DeliveryChartProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white p-6 animate-in fade-in zoom-in-95 duration-300">
      <h3 className="text-lg font-bold text-gray-800 mb-6 uppercase tracking-wide">Tendência de Entregas (Ano Atual)</h3>
      
      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{fontSize: 12}} />
                <YAxis unit="%" tick={{fontSize: 12}} domain={[0, 100]} />
                <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" height={36}/>
                <Line type="monotone" dataKey="onTime" name="Entregues no Prazo" stroke="#22c55e" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="late" name="Entregues Fora do Prazo" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="delayed" name="Atrasados" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
            </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
