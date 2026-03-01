"use client";

import React from 'react';
import { StockItem } from '@/lib/googleSheets';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StockDashboardProps {
    stocks: StockItem[];
}

export default function StockDashboard({ stocks }: StockDashboardProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR').format(Math.round(value)) + '원';
    };

    const formatPercent = (value: number) => {
        return (value * 100).toFixed(2) + '%';
    };

    return (
        <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: 600 }}>📈 주식 종목 현황</h2>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '12px 8px' }}>종목명</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>매수가</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>현재가</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>수량</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>평가금액</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>비중</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>전일비</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>수익률</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stocks.map((stock, idx) => {
                            const isUp = stock.dayChange > 0 || stock.returnRate > 0;
                            const isDown = stock.dayChange < 0 || stock.returnRate < 0;
                            const colorClass = isUp ? 'text-danger' : (isDown ? 'text-success' : 'text-secondary'); // 한국 주식은 빨간색이 상승, 파란/초록색이 하락 (여기서는 성공을 초록, 위험을 빨강으로 설정했지만 한국장 기준에 맞게 커스텀 가능)
                            // 여기서는 일반적인 기준(상승=초록/파랑, 하락=빨강)이 아닌 한국 기준(상승=빨강, 하락=파랑) 적용을 위해 CSS 클래스는 위험/성공으로 두되 의미적으로 상승을 danger(빨강)에 매핑
                            // 하지만 직관성을 위해 상승을 빨강, 하락을 파랑으로 바로 하드코딩할 수도 있습니다.

                            const rowStyle = { borderBottom: idx === stocks.length - 1 ? 'none' : '1px solid var(--border)' };

                            return (
                                <tr key={idx} style={rowStyle} className="stock-row">
                                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>{stock.name}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(stock.buyPrice)}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatCurrency(stock.currentPrice)}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>{stock.quantity.toLocaleString()}</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(stock.totalValue)}</td>

                                    <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                        {formatPercent(stock.assetRatio)}
                                    </td>

                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: stock.dayChange > 0 ? '#FF4757' : (stock.dayChange < 0 ? '#37A2EB' : 'inherit') }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                            {stock.dayChange > 0 ? <TrendingUp size={16} /> : (stock.dayChange < 0 ? <TrendingDown size={16} /> : <Minus size={16} color="var(--text-secondary)" />)}
                                            {formatPercent(Math.abs(stock.dayChange))}
                                        </div>
                                    </td>

                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: stock.returnRate > 0 ? '#FF4757' : (stock.returnRate < 0 ? '#37A2EB' : 'inherit') }}>
                                        {stock.returnRate > 0 ? '+' : ''}{formatPercent(stock.returnRate)}
                                    </td>
                                </tr>
                            );
                        })}

                        {stocks.length === 0 && (
                            <tr>
                                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    주식 데이터가 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
