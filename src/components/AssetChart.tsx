"use client";

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { StockItem } from '@/lib/googleSheets';

interface AssetChartProps {
    stocks: StockItem[];
}

const COLORS = [
    '#6C5CE7', '#2ED573', '#FF4757', '#FFA502',
    '#0984E3', '#00B894', '#E84393', '#FDCB6E',
    '#00CEC9', '#D63031', '#6C5CE7', '#B2BEC3'
];

export default function AssetChart({ stocks }: AssetChartProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const data = stocks
        .filter(item => item.assetRatio > 0 || item.totalValue > 0)
        .map(stock => ({
            name: stock.name,
            value: stock.assetRatio, // 툴팁 및 차트 크기 비율을 담당할 데이터
            originalValue: stock.totalValue // 원래 금액은 참고용 보관
        }));

    const totalAsset = stocks.reduce((sum, stock) => sum + stock.totalValue, 0);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR').format(Math.round(value)) + '원';
    };

    const formatPercent = (value: number) => {
        return (value * 100).toFixed(2) + '%';
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
                            formatter={(value: any) => formatPercent(Number(value) || 0)}
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
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>주식 총 평가금액</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        {formatCurrency(totalAsset)}
                    </div>
                </div>
            </div>
        </div>
    );
}
