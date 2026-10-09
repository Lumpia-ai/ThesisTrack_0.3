"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { ChartResponsiveContainer } from "@/components/shared/chart-responsive-container";

type DepartmentChartProps = {
  departmentId: string;
  chartData: any[];
};

export function DepartmentChart({ departmentId, chartData }: DepartmentChartProps) {
  return (
    <div className="relative w-full h-full min-h-[420px] flex flex-col p-8 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,58,143,0.08)] group">
      
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-100/40 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-amber-100/40 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center mb-8">
        <span className="inline-block px-3 py-1 mb-2 text-xs font-bold tracking-widest text-blue-600 uppercase bg-blue-50 rounded-full border border-blue-100/50">
          Analytics
        </span>
        <h3 className="text-center font-bold text-gray-900 text-2xl tracking-tight">
          {departmentId} Capstone Overview
        </h3>
        <p className="text-gray-500 text-sm mt-1">Project completion trajectory</p>
      </div>

      <div className="relative z-10 flex-1 w-full min-w-0 min-h-[320px]">
        <ChartResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
            <defs>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#003A8F" stopOpacity={0.9}/>
                <stop offset="95%" stopColor="#002255" stopOpacity={0.8}/>
              </linearGradient>
              <linearGradient id="colorOngoing" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F6BE00" stopOpacity={0.9}/>
                <stop offset="95%" stopColor="#D4A000" stopOpacity={0.8}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
            <XAxis 
              dataKey="year" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 13, fontWeight: 500 }}
              dy={15}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 13, fontWeight: 500 }}
              dx={-10}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(0,58,143,0.03)', rx: 8 }} 
              contentStyle={{ 
                background: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(16px)', 
                border: '1px solid rgba(255,255,255,0.8)', 
                borderRadius: '16px', 
                boxShadow: '0 12px 36px rgba(0,0,0,0.08)',
                padding: '12px 16px',
                fontWeight: 600
              }}
              itemStyle={{ fontSize: '14px', padding: '4px 0' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '30px' }} 
              iconType="circle" 
              iconSize={10} 
            />
            <Bar 
              dataKey="completed" 
              name="Completed Projects" 
              fill="url(#colorCompleted)" 
              radius={[6, 6, 0, 0]} 
              maxBarSize={45} 
            />
            <Bar 
              dataKey="ongoing" 
              name="Ongoing Studies" 
              fill="url(#colorOngoing)" 
              radius={[6, 6, 0, 0]} 
              maxBarSize={45} 
            />
          </BarChart>
        </ChartResponsiveContainer>
      </div>
    </div>
  );
}
