# 자산 대시보드 — 개발 인수인계 문서

개인 자산 관리(매매일지 + 포트폴리오) 웹앱입니다. 다른 PC에서 이어서 개발할 때 이 문서부터 읽으십시오.

> ⚠️ 이 저장소는 **public**입니다. 비밀 키(서비스 롤 키, 비밀번호 등)는 이 문서에 절대 적지 않습니다.
> 실제 값은 로컬의 `asset-management.txt`(저장소 밖, `../asset-management.txt`)와 Vercel 환경변수에 있습니다.

최종 갱신: 2026-07-05

---

## 1. 한 줄 요약

- **무엇**: 매매 내역을 Supabase에 기록하면 평단·누적수량·평가금액·수익률·전일비를 자동 계산해 보여주는 대시보드
- **어디서**: 로컬(localhost:3000), 배포(https://asset-manage-gcp.vercel.app) — PC/모바일 웹 모두
- **누가**: 비밀번호 접근(`APP_PASSWORD`)으로 보호

---

## 2. 기술 스택 / 아키텍처

```
[브라우저/모바일]
      │ (비밀번호 로그인, 미들웨어 proxy.ts)
      ▼
[Vercel · Next.js 16 (App Router) + React 19 + TypeScript]
   ├─ 서버에서 Supabase 조회/기록 (service role key)
   ├─ Recharts(차트), lucide-react(아이콘)
      │
      ├──────────────► [Supabase · Postgres]  ← 매매일지·보유·시세의 원천(SoT)
      │                    trades / prices / price_snapshots / holdings_v(view)
      │
      ├──────────────► [시세 API]  네이버금융(국내), Yahoo Finance(해외·환율)
      │
      └──────────────► [구글 시트]  현금성·연금/TDF만 (주식은 Supabase로 이관 완료)
```

- 매매/보유 데이터의 **원천은 Supabase**입니다. 구글 시트는 더 이상 주식을 담지 않습니다(Phase 5에서 시트의 주식 영역 정리 예정).
- 평단·누적수량·평가금액은 DB의 `holdings_v` 뷰가 `trades`를 집계해 자동 계산합니다.

---

## 3. 외부 자원

| 자원 | 위치 |
|---|---|
| GitHub | https://github.com/JY-financier/asset-manage-gcp |
| Vercel(배포) | https://asset-manage-gcp.vercel.app (프로젝트명 `asset-manage-gcp`) |
| Supabase | Project ref `tpygubqrqasopqjbbaue` / https://tpygubqrqasopqjbbaue.supabase.co |
| 구글 시트 | `자산 관리_2026_google sheet` (현금/TDF용) |
| 비밀 값 모음 | 로컬 `../asset-management.txt` (저장소 밖, 커밋 안 됨) |

---

## 4. 다른 PC에서 개발 시작하기

```bash
# 1) 클론
git clone https://github.com/JY-financier/asset-manage-gcp.git
cd asset-manage-gcp

# 2) 패키지 설치
npm install

# 3) .env.local 생성 (아래 5개 변수 — 값은 asset-management.txt / Vercel에서 복사)
#    (Windows PowerShell에서는 메모장 등으로 파일 생성)

# 4) 개발 서버
npm run dev
# http://localhost:3000  → 로그인(APP_PASSWORD)
```

### `.env.local`에 필요한 변수 (값은 문서에 없음 — 별도 보관처 참조)

```
NEXT_PUBLIC_SUPABASE_URL=https://tpygubqrqasopqjbbaue.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # asset-management.txt
SUPABASE_SERVICE_ROLE_KEY=eyJ...                          # asset-management.txt (서버 전용, NEXT_PUBLIC_ 금지)
APP_PASSWORD=...                                          # 웹 접근 비밀번호
CRON_SECRET=...                                           # 자정 스냅샷 cron 인증 (Vercel과 동일 값)
```

> 참고: `.env*`는 gitignore되어 클론 시 따라오지 않습니다. 새 PC에서는 위 값을 다시 채워야 합니다.
> Vercel에는 이미 동일 변수가 등록되어 있으므로, 배포는 값 재설정 없이 동작합니다.

---

## 5. 배포

- `main` 브랜치에 **push하면 Vercel이 자동 빌드·배포**합니다.
- 코드만 바뀐 경우: `git push origin main` 만 하면 끝.
- 환경변수를 새로 추가/변경한 경우: Vercel에 반영 후 재배포 필요.
- `vercel.json`의 `crons`가 자정 스냅샷 작업을 자동 등록합니다.

---

## 6. 데이터 모델 (Supabase)

SQL은 `supabase/` 폴더에 순서대로 있습니다. **새 DB를 처음부터 만들 때** 다음 순서로 실행:

1. `001_schema.sql` — `trades`, `prices` 테이블 + `holdings_v` 뷰
2. `003_fix_holdings_v.sql` — 뷰에 account 컬럼 포함(001 이후 보정. 001을 최신본으로 실행했다면 생략 가능)
3. `004_price_snapshots.sql` — `price_snapshots` 테이블 + 현재 시세로 최초 기준선 시딩

> `002_seed_holdings.sql`(초기 보유 이관)은 **개인 데이터**라 gitignore되어 저장소에 없습니다. 데이터는 이미 Supabase에 들어 있으므로 재실행 불필요.

### 테이블 요약

- **trades** (매매 원장, append-only)
  `id, ticker, name, category, account, trade_date, side(BUY|SELL), price, quantity, fee, currency(KRW|USD|JPY), memo, created_at`
- **prices** (현재가 캐시)
  `ticker(PK), current_price, currency, updated_at` — 환율은 `ticker = 'FX:USDKRW'`로 저장
- **price_snapshots** (전일비 기준선, 매일 자정 저장)
  `ticker, snapshot_date, price, currency, created_at` (PK: ticker+snapshot_date)
- **holdings_v** (뷰) — trades+prices 집계
  `ticker, name, category, account, currency, total_qty, avg_buy_price, total_cost, current_price, market_value, unrealized_pnl, price_updated_at`

### 티커 형식
`거래소:코드` — 예) `KRX:005930`, `NASDAQ:GOOG`, `NYSEARCA:VNQ`, `BATS:USHY`. 국내는 `KRX:`, 미국은 `NASDAQ:/NYSE:/NYSEARCA:/BATS:/AMEX:`.

---

## 7. 페이지 / API 맵

### 페이지
| 경로 | 설명 |
|---|---|
| `/` | 대시보드 (상단 4지표 + 보유 종목 표 + 비중 차트) |
| `/trades` | 매매일지 (목록 + 행별 수정/삭제) |
| `/trades/new` | 거래 추가 폼 |
| `/trades/[id]/edit` | 거래 수정 폼 (값 프리필) |
| `/login` | 비밀번호 로그인 |

### API
| 엔드포인트 | 메서드 | 용도 |
|---|---|---|
| `/api/trades` | GET, POST | 매매 목록 조회 / 신규 기록 |
| `/api/trades/[id]` | GET, PATCH, DELETE | 단건 조회 / 수정 / 삭제 |
| `/api/holdings` | GET | 보유 종목(holdings_v) |
| `/api/prices/refresh` | GET, POST | 시세 수동 갱신 |
| `/api/cron/snapshot` | GET, POST | 자정 스냅샷(시세 갱신+저장). `CRON_SECRET`으로 자체 인증 |

- 인증: 미들웨어(`src/proxy.ts`)가 `/api/cron`을 제외한 모든 경로에 비밀번호 쿠키를 요구. 미인증 API는 401.

---

## 8. 주요 파일

```
src/
├─ proxy.ts                     # 미들웨어(비밀번호 게이트, /api/cron 예외)
├─ lib/
│  ├─ supabase.ts               # Supabase 클라이언트(공개/서비스) + 도메인 타입
│  ├─ prices.ts                 # 시세 조회·갱신, 스냅샷 로직(네이버/야후)
│  ├─ tradeValidation.ts        # 거래 입력 검증(POST/PATCH 공용)
│  └─ colors.ts                 # 손익 색상(이익 코랄 #FF8FA3 / 손실 스카이 #7FC8FF)
├─ components/
│  ├─ Navigation.tsx            # 상단 탭(가장 구체적 경로만 활성화)
│  ├─ StockDashboard.tsx        # 보유 종목 표(반응형 열)
│  ├─ AssetChart.tsx            # 비중 파이차트
│  ├─ TradeForm.tsx             # 거래 입력/수정 공용 폼
│  ├─ DeleteTradeButton.tsx     # 삭제 버튼(확인창)
│  └─ PriceRefresher.tsx        # 시세 수동 갱신 버튼
└─ app/
   ├─ page.tsx                  # 대시보드(정렬·전일비·집계)
   ├─ trades/…                  # 매매일지/추가/수정
   └─ api/…                     # 위 API 라우트
supabase/                       # DB 마이그레이션 SQL
vercel.json                     # cron 스케줄
```

---

## 9. 자주 하는 작업

- **거래 추가/수정/삭제**: 앱의 매매일지 화면에서 직접. (구글 시트 아님)
- **시세 수동 갱신**: 대시보드 상단의 갱신 버튼(`/api/prices/refresh`).
- **시세 자동 갱신**: 매일 자정(KST) Vercel Cron → `/api/cron/snapshot`.
- **DB 직접 편집**: Supabase 대시보드 Table Editor에서도 가능(비상시).

---

## 10. 진행 현황 / 남은 작업

### 완료
- Supabase 스키마 + 초기 보유 이관
- 매매일지: 추가·조회·**수정·삭제**
- 대시보드: 보유 표 + 비중 차트, 상단 4지표(총 평가금액/총 매입원가/평가손익/전일비)
- 자동 시세 + 전일비(자정 스냅샷)
- UX: 정렬 규칙(주식국내→주식미국→리츠→채권→그외, 그룹 내 원화→달러·평가금액순), 반응형(모바일 헤더 2×2·표 5열), 헤더 단색(#6C5CE7)

### 남은 작업 (TODO)
- [ ] **전일비 활성화 확인**: ① `supabase/004_price_snapshots.sql` 실행 여부, ② Vercel에 `CRON_SECRET` 등록 여부, ③ Vercel > Settings > Cron Jobs에 `/api/cron/snapshot` 등록 확인. (미완 시 전일비가 "준비 중" 표시)
- [ ] **Phase 5**: 구글 시트의 주식 영역 제거(현금/TDF만 유지), `googleSheets.ts` 슬림화
- [ ] (아이디어) Claude 채팅으로 매매 기록 → `/api/trades` POST 연동
- [ ] (아이디어) 자산 추이 라인차트(일별 평가금액 스냅샷 활용)

---

## 11. 정렬·색상 규칙 메모

- **행 정렬**(대시보드 보유 표): 구분 우선순위(주식국내0 → 주식미국1 → 리츠미국2 → 채권미국3 → 그외4) → 통화(원화 먼저→달러) → 평가금액 큰 순(시세 없으면 매입원가 대체). 로직: `src/app/page.tsx`의 `sortHoldings`.
- **손익 색상**: 이익=코랄 `#FF8FA3`, 손실=스카이 `#7FC8FF` (`src/lib/colors.ts`에서 한 곳 관리). 헤더·표 공통.
- **매수/매도 뱃지**: 매수 빨강(#FF4757), 매도 파랑(#37A2EB).
