-- =====================================================
-- 006: other_assets에 연금 필드 추가 (원금·세부구분)
-- 실행 위치: Supabase SQL Editor
-- 이미 005로 테이블을 만든 뒤 실행. 기존 파킹 데이터는 그대로 유지됨.
-- =====================================================

ALTER TABLE other_assets ADD COLUMN IF NOT EXISTS subcategory TEXT;              -- 연금: '예금' | 'TDF'
ALTER TABLE other_assets ADD COLUMN IF NOT EXISTS principal NUMERIC(18, 2);      -- 연금 원금

COMMENT ON COLUMN other_assets.subcategory IS '연금 세부구분(예금/TDF). 파킹은 NULL.';
COMMENT ON COLUMN other_assets.principal IS '원금. 연금 손익·수익률 계산용. 파킹은 NULL.';
