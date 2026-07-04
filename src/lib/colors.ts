// 손익 색상 (이익=코랄, 손실=스카이). 한 곳에서만 관리하여 색조 조정 시 여기만 수정.
export const GAIN_COLOR = "#FF8FA3"; // 코랄 — 이익/상승
export const LOSS_COLOR = "#7FC8FF"; // 스카이 — 손실/하락
export const FLAT_COLOR = "inherit"; // 변동 없음

export function pnlColor(value: number | null | undefined): string {
    if (value === null || value === undefined || value === 0) return FLAT_COLOR;
    return value > 0 ? GAIN_COLOR : LOSS_COLOR;
}
