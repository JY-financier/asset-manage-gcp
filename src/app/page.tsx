import React from 'react';
import { fetchWealthData } from '@/lib/googleSheets';
import StockDashboard from '@/components/StockDashboard';
import AssetChart from '@/components/AssetChart';

export const revalidate = 60; // 60초마다 데이터 재검증 (캐싱)

export default async function Home() {
  const { stocks } = await fetchWealthData();

  const totalStockValue = stocks.reduce((acc, stock) => acc + stock.totalValue, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(value)) + '원';
  };

  return (
    <main className="container" style={{ padding: '40px 16px', minHeight: '100vh', paddingBottom: '80px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          개인 자산 대시보드
        </h1>
        <p className="text-secondary">구글 시트 연동 기반 실시간 모니터링</p>
      </header>

      {/* 총 자산 하이라이트 */}
      <div className="card" style={{ marginBottom: '32px', background: 'linear-gradient(135deg, var(--accent) 0%, #a29bfe 100%)', color: '#fff', border: 'none' }}>
        <div style={{ fontSize: '1.125rem', opacity: 0.9, marginBottom: '8px' }}>주식 총 평가금액</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{formatCurrency(totalStockValue)}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <StockDashboard stocks={stocks} />
        <AssetChart stocks={stocks} />
      </div>
    </main>
  );
}
