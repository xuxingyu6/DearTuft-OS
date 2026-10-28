/**
 * Money storage
 * -------------
 * USD is stored as integer cents (1 USD = 100 cents).
 * CNY is stored as integer fen (1 CNY = 100 fen).
 * The FX snapshot is an integer: CNY per 1 USD, scaled by 1e6.
 *   7.20 CNY/USD is stored as 7_200_000.
 *
 * Conversion (half-up via Math.round):
 *   usd_cents = round(cny_fen * 1_000_000 / fx_cny_per_usd_e6)
 *
 * Because 100 fen = 1 CNY and 100 cents = 1 USD, dividing fen by
 * (CNY per USD) yields cents directly.
 *
 * Sales prices are USD. Production, shipping, and other variable costs
 * are CNY on the order header. Payment fees are USD cents (processor
 * fees on the USD charge). Extra cost lines may be either currency and
 * are converted with the order's FX snapshot.
 */

export const FX_SCALE = 1_000_000;
export const DEFAULT_FX_E6 = 7_200_000;
export const DEFAULT_TARGETS: Record<string, number> = {
  "2026-11": 2,
  "2026-12": 5,
  "2027-01": 8,
};

export function cnyFenToUsdCents(fen: number, fxE6: number): number {
  if (!fxE6 || fxE6 <= 0) return 0;
  return Math.round((fen * FX_SCALE) / fxE6);
}

export function usdCentsToCnyFen(cents: number, fxE6: number): number {
  if (!fxE6 || fxE6 <= 0) return 0;
  return Math.round((cents * fxE6) / FX_SCALE);
}

export function formatUsdCents(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "—";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}$${dollars.toLocaleString("en-US")}.${String(rem).padStart(2, "0")}`;
}

export function formatCnyFen(fen: number | null | undefined): string {
  if (fen == null || !Number.isFinite(fen)) return "—";
  const sign = fen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(fen));
  const yuan = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}¥${yuan.toLocaleString("en-US")}.${String(rem).padStart(2, "0")}`;
}

export function formatFx(e6: number | null | undefined): string {
  if (e6 == null || !Number.isFinite(e6) || e6 <= 0) return "—";
  const whole = Math.trunc(e6 / FX_SCALE);
  const frac = String(Math.abs(e6 % FX_SCALE)).padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : String(whole);
}

export function formatInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function formatPct(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

export function ratio(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return numerator / denominator;
}

export function parseUsdToCents(raw: string): number {
  const n = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("金额必须是大于等于 0 的数字");
  }
  return Math.round(n * 100);
}

export function parseCnyToFen(raw: string): number {
  return parseUsdToCents(raw);
}

export function parseFxToE6(raw: string): number {
  const n = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("汇率必须是大于 0 的数字（1 美元兑换多少人民币）");
  }
  return Math.round(n * FX_SCALE);
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}${dollars}.${String(rem).padStart(2, "0")}`;
}
