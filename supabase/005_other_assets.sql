-- =====================================================
-- Phase 5: 비주식 자산(현금성·TDF·예금) 테이블
-- 실행 위치: Supabase SQL Editor
-- 통합 대시보드(/portfolio)에서 주식 평가액과 합산해 총자산·비중을 계산.
-- 값(개인 금액)은 앱의 자산 관리 화면에서 직접 입력 → 이 파일엔 데이터 없음.
-- =====================================================

CREATE TABLE IF NOT EXISTS other_assets (
    id          BIGSERIAL PRIMARY KEY,
    category    TEXT NOT NULL,                 -- '파킹'(자유 이동) | '연금'(정기예금·TDF 등 묶인 돈)
    subcategory TEXT,                          -- 연금 세부구분: '예금' | 'TDF' (파킹은 NULL)
    name        TEXT NOT NULL,
    account     TEXT,
    principal   NUMERIC(18, 2),                -- 원금 (연금에서 손익·수익률 계산용, 파킹은 NULL)
    amount      NUMERIC(18, 2) NOT NULL,       -- 평가금액 (currency 기준)
    currency    TEXT NOT NULL DEFAULT 'KRW' CHECK (currency IN ('KRW', 'USD', 'JPY')),
    memo        TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_other_assets_category ON other_assets(category);

ALTER TABLE other_assets DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE other_assets IS '비주식 자산(현금성/TDF/예금 등). 앱 자산 관리 화면에서 CRUD.';
