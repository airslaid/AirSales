
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  color: string; 
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
  const baseColor = color.split('-')[1] || 'gray';
  const bgClass = `bg-${baseColor}-50`;
  const iconColorClass = color;

  return (
    <div className="bg-white p-3 border border-gray-200 shadow-sm hover:border-gray-900 transition-colors flex items-center justify-between group">
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">{title}</p>
        <h3 className="text-lg font-bold text-gray-900 tracking-tighter tabular-nums truncate">
          {value}
        </h3>
      </div>
      <div className={`w-7 h-7 flex items-center justify-center border border-gray-100 transition-colors group-hover:border-gray-900`}>
        <Icon className={`w-3.5 h-3.5 ${iconColorClass}`} strokeWidth={1.5} />
      </div>
    </div>
  );
};
