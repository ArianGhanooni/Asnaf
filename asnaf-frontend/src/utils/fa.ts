const d = '۰۱۲۳۴۵۶۷۸۹';

export function fa(v: string | number): string {
  return String(v).replace(/[0-9]/g, (c) => d[+c] ?? c);
}

export function faNum(n: number): string {
  return fa(n.toLocaleString('en-US').replace(/,/g, '٬'));
}
