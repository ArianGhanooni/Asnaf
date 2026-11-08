import type { RiskInput, RiskLevel } from 'src/types/asnaf';
import { riskLabels } from 'src/types/asnaf';

export { riskLabels };

export function complaintMembership(n: number): { low: number; med: number; high: number } {
  const c = Math.max(0, Math.min(10, n));
  const low = c === 1 ? 1 : 0;
  const med = c === 2 ? 0.33 : c === 3 ? 1 : c === 4 ? 0.67 : 0;
  const high = c === 5 ? 1 : c === 6 ? 0.5 : c >= 7 ? 1 : 0;
  return { low, med, high };
}

export function levelOf(score: number): RiskLevel {
  if (score > 75) return 'critical';
  if (score > 50) return 'high';
  if (score > 25) return 'medium';
  return 'low';
}

export function evaluateRisk(i: RiskInput): { score: number; level: RiskLevel; action: string } {
  const m = complaintMembership(i.complaints);
  let score = 5 + (i.noLicense ? 12 : 0) + (i.noSign ? 5 : 0) + m.low * 8 + m.med * 15 + m.high * 20;
  let action = 'پایش دوره‌ای';

  if (i.noLicense && i.noSign) {
    score = Math.max(score, 55 + m.med * 10);
    action = 'تعیین تکلیف شناسه';
  }
  if (i.noLicense && i.complaints >= 1) {
    score = Math.max(score, 58 + Math.min(i.complaints, 5) * 3);
    action = 'اولویت اول سرکشی';
  }
  if (i.complaints >= 2) {
    score = Math.max(score, 55 + Math.min(i.complaints, 10) * 2);
    action = 'اعزام فوری بازرس';
  }
  if (i.warningExpired) {
    score = Math.max(score, 82);
    action = 'انتقال به آماده پلمپ';
  }
  if (i.nonCooperation) {
    score = Math.max(score, 85 + (i.warningExpired ? 8 : 0));
    action = 'صدور احضار / دعوت‌نامه';
  }
  score = Math.round(Math.min(100, score));
  return { score, level: levelOf(score), action };
}
