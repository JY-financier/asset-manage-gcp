-- =====================================================
-- holdings_v 뷰 재정의 (account 컬럼 누락 수정)
-- 실행 위치: Supabase SQL Editor
-- 원인: 001_schema.sql의 초기 뷰 정의에 account가 빠져 있어
--       002의 검증 쿼리(SELECT ... account ...)가 실패
-- 주의: Postgres CREATE OR REPLACE VIEW는 컬럼 순서/이름 변경 불가,
--       DROP 후 재생성해야 함. 뷰에는 데이터가 없으므로 안전.
-- =====================================================

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
        STRING_AGG(DISTINCT account, ', ') AS account,   -- 여러 계좌에 걸친 종목은 콤마로 묶음
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

-- =====================================================
-- 재검증
-- =====================================================

-- 1) INSERT가 실제로 들어갔는지 (검증 쿼리에서 에러 났어도 앞의 INSERT는 성공했을 가능성)
SELECT COUNT(*) AS trade_count FROM trades;
-- 기대값: 8

-- 2) 이제 정상 조회되는지
SELECT ticker, name, category, account, total_qty, avg_buy_price, total_cost, currency
FROM holdings_v
ORDER BY category, name;

-- 3) 총 매입원가 대조
SELECT
    SUM(total_cost) FILTER (WHERE currency = 'KRW') AS krw_total_cost,
    SUM(total_cost) FILTER (WHERE currency = 'USD') AS usd_total_cost
FROM holdings_v;
