const AMOUNT_PATTERN = /^(\d+),(\d{2})$/;
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

export function parseAmountToCents(text: string): number | null {
  const match = AMOUNT_PATTERN.exec(text);
  if (!match) return null;
  const cents = BigInt(match[1]) * 100n + BigInt(match[2]);
  if (cents > MAX_SAFE) return null;
  return Number(cents);
}

const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const reais = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  return `${sign}R$ ${integerFormatter.format(reais)},${rest}`;
}

export function formatSignedCents(cents: number): string {
  return cents > 0 ? `+${formatCents(cents)}` : formatCents(cents);
}

export function differenceClass(cents: number): string {
  if (cents > 0) return 'amount--positive';
  if (cents < 0) return 'amount--negative';
  return '';
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidIsoDate(text: string): boolean {
  const match = DATE_PATTERN.exec(text);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
