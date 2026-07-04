-- =====================================================
-- 자산 관리 시스템 - Phase 1 스키마
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 실행 순서: 001_schema.sql -> 002_seed_holdings.sql
-- =====================================================

-- 1. 매매 원장 (append-only)
CREATE TABLE IF NOT EXISTS trades (
    id            BIGSERIAL PRIMARY KEY,
    ticker        TEXT NOT NULL,                -- 'KRX:148020', 'NASDAQ:GOOG' 형식 (시트와 동일)
    name          TEXT NOT NULL,                -- 종목명 (한글 OK)
    category      TEXT,                         -- '주식(국내)', '주식(미국)', '리츠(미국)', '채권(미국)' 등
    account       TEXT,                         -- 계좌명 ('메리츠', '삼성증권 연금' 등)
    trade_date    DATE NOT NULL,
    side          TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    price         NUMERIC(18, 4) NOT NULL,      -- 단가 (현지 통화 기준)
    quantity      NUMERIC(18, 4) NOT NULL,      -- 수량 (소수점 허용 — TDF, USD 등)
    fee           NUMERIC(18, 2) DEFAULT 0,     -- 수수료 (KRW 기준)
    currency      TEXT NOT NULL DEFAULT 'KRW' CHECK (currency IN ('KRW', 'USD', 'JPY')),
    memo          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_ticker     ON trades(ticker);
CREATE INDEX IF NOT EXISTS idx_trades_trade_date ON trades(trade_date DESC);

COMMENT ON TABLE trades IS '매매 원장(append-only). 평단/누적수량은 holdings_v 뷰에서 자동 계산.';
COMMENT ON COLUMN trades.ticker IS '거래소:코드 형식. 예) KRX:148020, NASDAQ:GOOG, NYSEARCA:VNQ';

-- 2. 현재가 캐시
CREATE TABLE IF NOT EXISTS prices (
    ticker         TEXT PRIMARY KEY,
    current_price  NUMERIC(18, 4) NOT NULL,
    currency       TEXT NOT NULL DEFAULT 'KRW',
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE prices IS '현재가 캐시. Phase 4에서 yfinance/네이버금융으로 자동 갱신.';

-- 3. 보유 종목 집계 뷰 (BUY는 +, SELL은 -)
--    - total_qty       : 누적 보유 수량
--    - avg_buy_price   : 가중평균 매수단가 (매도 차감 후 잔여 매수 평균)
--    - total_cost      : 총 매입원가 (수수료 포함)
DROP VIEW IF EXISTS holdings_v;

CREATE VIEW holdings_v AS
WITH signed AS (
    SELECT
        ticker,
        name,
        category,
        account,
        currency,
        CASE WHEN side = 'BUY' THEN quantity ELSE -quantity END AS qty,
        CASE WHEN side = 'BUY' THEN price * quantity + COALESCE(fee, 0) ELSE 0 END AS buy_cost,
        CASE WHEN side = 'BUY' THEN quantity ELSE 0 END AS buy_qty
    FROM trades
),
agg AS (
    SELECT
        ticker,
        MAX(name)     AS name,
        MAX(category) AS category,
        STRING_AGG(DISTINCT account, ', ') AS account,
        MAX(currency) AS currency,
        SUM(qty)       AS total_qty,
        SUM(buy_cost)  AS gross_buy_cost,
        SUM(buy_qty)   AS gross_buy_qty
    FROM signed
    GROUP BY ticker
)
SELECT
    a.ticker,
    a.name,
    a.category,
    a.account,
    a.currency,
    a.total_qty,
    CASE WHEN a.gross_buy_qty > 0
         THEN ROUND(a.gross_buy_cost / a.gross_buy_qty, 4)
         ELSE 0 END                                          AS avg_buy_price,
    ROUND(
        CASE WHEN a.gross_buy_qty > 0
             THEN (a.gross_buy_cost / a.gross_buy_qty) * a.total_qty
             ELSE 0 END,
        2
    )                                                        AS total_cost,
    p.current_price,
    p.updated_at AS price_updated_at,
    CASE WHEN p.current_price IS NOT NULL
         THEN ROUND(p.current_price * a.total_qty, 2)
         ELSE NULL END                                        AS market_value,
    CASE WHEN p.current_price IS NOT NULL AND a.gross_buy_qty > 0
         THEN ROUND(
             (p.current_price * a.total_qty)
             - ((a.gross_buy_cost / a.gross_buy_qty) * a.total_qty),
             2
         )
         ELSE NULL END                                        AS unrealized_pnl
FROM agg a
LEFT JOIN prices p USING (ticker)
WHERE a.total_qty > 0;

COMMENT ON VIEW holdings_v IS '현재 보유 종목 집계. trades + prices를 조인하여 평단·평가금액·평가손익을 즉시 계산.';

-- 4. (선택) Row Level Security — Phase 1에서는 비활성으로 두고, 향후 인증 도입 시 활성화
ALTER TABLE trades  DISABLE ROW LEVEL SECURITY;
ALTER TABLE prices  DISABLE ROW LEVEL SECURITY;
