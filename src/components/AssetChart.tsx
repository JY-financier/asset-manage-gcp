"use client";

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AssetAllocation } from '@/lib/googleSheets';

interface AssetChartProps {
    allocation: AssetAllocation;
}

const COLORS = ['#6C5CE7', '#2ED573', '#FF4757', '#FFA502'];

export default function AssetChart({ allocation }: AssetChartProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const data = [
        { name: '현금', value: allocation.cash },
        { name: '주식', value: allocation.stock },
        { name: 'TDF', value: allocation.tdf },
    ].filter(item => item.value > 0);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR').format(Math.round(value)) + '원';
    };

    if (!isMounted) return <div className="card" style={{ height: '400px' }}>차트 로딩 중...</div>;

    return (
        <div className="card" style={{ height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: 600 }}>🥧 자산 비중</h2>
            <div style={{ flex: 1, position: 'relative', minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            animationBegin={0}
                            animationDuration={1500}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => formatCurrency(Number(value) || 0)}
                            contentStyle={{ backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ color: 'var(--text-secondary)' }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    marginTop: '-18px'
                }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>총 자산</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        {formatCurrency(allocation.total)}
                    </div>
                </div>
            </div>
        </div>
    );
}
