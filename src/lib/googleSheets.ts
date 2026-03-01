import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

export async function getGoogleSheetsClient() {
    const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;

    if (!credentialsBase64) {
        throw new Error('GOOGLE_CREDENTIALS_BASE64 is not set in environment variables');
    }

    const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf8');
    const credentials = JSON.parse(credentialsJson);

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key,
        },
        scopes: SCOPES,
    });

    return google.sheets({ version: 'v4', auth });
}

export interface StockItem {
    name: string;
    buyPrice: number;
    currentPrice: number;
    quantity: number;
    totalValue: number;
    dayChange: number;
    returnRate: number;
    assetRatio: number; // I열: 개별 종목의 자산 비중
}

export interface AssetAllocation {
    cash: number;
    stock: number;
    tdf: number;
    total: number;
    cashRatio: number;
    stockRatio: number;
    tdfRatio: number;
}

export async function fetchWealthData() {
    if (!process.env.GOOGLE_CREDENTIALS_BASE64) {
        console.warn("Using mock data because GOOGLE_CREDENTIALS_BASE64 is not set");
        return {
            stocks: [
                { name: "삼성전자", buyPrice: 70000, currentPrice: 72000, quantity: 100, totalValue: 7200000, dayChange: 0.007, returnRate: 0.028, assetRatio: 0.25 },
                { name: "현대차", buyPrice: 200000, currentPrice: 195000, quantity: 50, totalValue: 9750000, dayChange: -0.012, returnRate: -0.025, assetRatio: 0.35 },
                { name: "Apple (AAPL)", buyPrice: 150000, currentPrice: 165000, quantity: 20, totalValue: 3300000, dayChange: 0.021, returnRate: 0.1, assetRatio: 0.15 },
                { name: "리얼티인컴 (O)", buyPrice: 70000, currentPrice: 68000, quantity: 100, totalValue: 6800000, dayChange: 0, returnRate: -0.028, assetRatio: 0.25 },
            ],
            assetAllocation: {
                cash: 6000000,
                stock: 27050000,
                tdf: 12000000,
                total: 45050000,
                cashRatio: 6000000 / 45050000,
                stockRatio: 27050000 / 45050000,
                tdfRatio: 12000000 / 45050000,
            }
        };
    }

    const sheets = await getGoogleSheetsClient();

    // 1. 주식 현황 가져오기 (2~11행 지정을 포함하여 넉넉하게 2~50행 파싱)
    // B열: 종목명, C열: 매수가, D열: 현재가, E열: 수량, F열: 평가금액, G열: 전일비, H열: 수익률, I열: 자산 비중
    const stockRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'chart!B2:I50',
    });

    const stockRows = stockRes.data.values || [];
    const stocks: StockItem[] = [];

    for (const row of stockRows) {
        const name = row[0];
        if (!name || name.trim() === '') continue; // 종목명이 없으면 스킵

        // 계산용 행(TOTAL, 합계 등) 필터링
        const upperName = name.trim().toUpperCase();
        if (upperName.includes('TOTAL') || upperName.includes('합계') || upperName.includes('총계')) continue;

        // 숫자 파싱 유틸리티 (콤마, % 기호 등 제거 및 NaN 방어)
        const parseNumber = (val?: string) => {
            if (!val) return 0;
            const cleanStr = val.toString().replace(/[^0-9.-]/g, '');
            if (cleanStr === '' || cleanStr === '-' || cleanStr === '.') return 0;
            const parsed = Number(cleanStr);
            return isNaN(parsed) ? 0 : parsed;
        };

        stocks.push({
            name: name.trim(),
            buyPrice: parseNumber(row[1]),
            currentPrice: parseNumber(row[2]),
            quantity: parseNumber(row[3]),
            totalValue: parseNumber(row[4]),
            dayChange: parseNumber(row[5]) / 100, // 전일비가 % 값이라고 가정하여 1.5% 처럼 올 경우 0.015 로 변환
            returnRate: parseNumber(row[6]) / 100, // 수익률 변환
            assetRatio: parseNumber(row[7]) / 100, // I열 자산 비중 (퍼센트일 경우를 고려해 / 100, 데이터 포맷에 따라 조정 가능)
        });
    }

    // 2. 자산 비중 데이터 통째로 가져오기 (값은 항상 I열 참조)
    const assetRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'chart!A1:J50',
    });

    const assetRows = assetRes.data.values || [];

    let cash = 0, stockAsset = 0, tdf = 0, total = 0;

    for (const row of assetRows) {
        let label = '';
        // A~H열(인덱스 0~7) 안에서 주요 키워드(라벨)를 찾습니다.
        for (let j = 0; j < 8; j++) {
            const cell = (row[j] || '').toString().trim();
            if (cell.includes('현금') || cell.includes('주식') || cell.includes('TDF') || cell.includes('총 자산') || cell.includes('총 평가금액')) {
                label = cell;
                break;
            }
        }

        // 사용자의 요청대로 자산 비중 값은 반드시 I열(인덱스 8)에서 가져옵니다.
        const valueStr = (row[8] || '').toString();

        if (!label || !valueStr) continue;

        const cleanValStr = valueStr.toString().replace(/[^0-9.-]/g, '');
        let val = 0;
        if (cleanValStr !== '' && cleanValStr !== '-' && cleanValStr !== '.') {
            const parsed = Number(cleanValStr);
            if (!isNaN(parsed)) val = parsed;
        }

        if (label.includes('현금')) cash = val;
        else if (label.includes('주식')) stockAsset = val;
        else if (label.includes('TDF')) tdf = val;
        else if (label.includes('총 자산') || label.includes('총 평가금액')) total = val;
    }

    // Fallback if total is missing
    if (total === 0) {
        total = cash + stockAsset + tdf;
    }

    const assetAllocation: AssetAllocation = {
        cash,
        stock: stockAsset,
        tdf,
        total,
        cashRatio: total > 0 ? (cash / total) : 0,
        stockRatio: total > 0 ? (stockAsset / total) : 0,
        tdfRatio: total > 0 ? (tdf / total) : 0,
    };

    return { stocks, assetAllocation };
}
