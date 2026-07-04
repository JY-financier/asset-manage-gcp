-- =====================================================
-- Phase 4-b: 일별 시세 스냅샷 (전일비 계산용)
-- 실행 위치: Supabase SQL Editor
-- 매일 자정(KST) Vercel Cron이 시세를 갱신하고 이 테이블에 저장한다.
-- 전일비 = 현재가(prices) - 최근 스냅샷(price_snapshots)
-- =====================================================

CREATE TABLE IF NOT EXISTS price_snapshots (
    ticker         TEXT NOT NULL,
    snapshot_date  DATE NOT NULL,
    price          NUMERIC(18, 4) NOT NULL,
    currency       TEXT NOT NULL DEFAULT 'KRW',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ticker, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date ON price_snapshots(snapshot_date DESC);

ALTER TABLE price_snapshots DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE price_snapshots IS '매일 자정(KST) 시세 스냅샷. 전일비 기준선.';

-- 최초 기준선: 현재 prices 값을 오늘자 스냅샷으로 즉시 시딩
-- (배포 직후 전일비가 빈 값으로 뜨지 않도록. 이후 매일 자정 cron이 갱신)
INSERT INTO price_snapshots (ticker, snapshot_date, price, currency)
SELECT ticker, CURRENT_DATE, current_price, currency
FROM prices
ON CONFLICT (ticker, snapshot_date) DO NOTHING;

-- 확인
SELECT snapshot_date, COUNT(*) AS tickers FROM price_snapshots GROUP BY snapshot_date ORDER BY snapshot_date DESC;
