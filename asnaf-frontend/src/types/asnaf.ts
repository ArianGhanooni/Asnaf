export type CaseStatus =
  | 'warning_1'
  | 'warning_2'
  | 'seal_requested'
  | 'seal_ordered'
  | 'sealed'
  | 'dismissed'
  | 'unsealed'
  | 'licensed'
  | 'warning'
  | 'readySeal'
  | 'collect';

export const statusLabels: Record<CaseStatus, string> = {
  warning_1: 'اخطار بدوی (۷۲ ساعته)',
  warning_2: 'اخطار ثانویه اماکن (۱۰ روزه)',
  seal_requested: 'درخواست پلمپ اتحادیه',
  seal_ordered: 'اقدام به پلمپ (دستور اتاق)',
  sealed: 'پلمپ شده',
  dismissed: 'منع پیگیری (رفع تخلف)',
  unsealed: 'فک پلمپ اداری',
  licensed: 'دارای پروانه کسب (ماده ۲۷)',
  // سازگاری با داده‌های اولیه
  warning: 'اخطار اولیه',
  readySeal: 'آماده پلمپ',
  collect: 'بررسی جمع‌آوری',
};

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const riskLabels: Record<RiskLevel, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'بالا',
  critical: 'بحرانی',
};

export interface RiskInput {
  noLicense: boolean;
  complaints: number;
  nonCooperation: boolean;
  noSign: boolean;
  warningExpired: boolean;
}

export interface Unit {
  id: number;
  name: string;
  operator: string;
  nationalId: string;
  mobile: string;
  birthDate?: string | undefined;
  union: string;
  region: string;
  address: string;
  violation: string;
  status: CaseStatus;
  warningNo?: string | undefined;
  date: string;
  simba?: string | undefined;
  distance: number;
  x: number;
  y: number;
  risk: RiskInput;
  notes?: string | undefined;
  // فیلدهای چرخه حیات و لاگ ممیزی
  auditTrail?: OperatorAuditLog[] | undefined;
  warning1Date?: string | undefined;
  warning2Date?: string | undefined;
  sealRequestedDate?: string | undefined;
  sealOrderNo?: string | undefined;
  sealOrderDate?: string | undefined;
  amakenReportNo?: string | undefined;
  sealExecutionDate?: string | undefined;
  resolutionType?: 'dismissal' | 'unseal' | undefined;
  resolutionDate?: string | undefined;
  resolutionLetterNo?: string | undefined;
  fineTrackingCode?: string | undefined;
  graceEndDate?: string | undefined;
  dismissalDuration?: '1m' | '3m' | undefined;
}

export type MissionStatus = 'active' | 'pending_approval' | 'done';
export type MissionSource = 'simba_complaint' | 'routine_inspection';

export interface MissionCompletionReport {
  readonly letterNumber: string;
  readonly letterDate: string;
  recipient: string;
  subject: string;
  findings: string;
  actionTaken: string;
  notes: string;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string | undefined;
  approvedAt?: string | undefined;
}

export interface InspectorInfo {
  readonly id: number;
  readonly name: string;
  readonly union: string;
  readonly mobile: string;
  readonly region: string;
}

export interface Mission {
  id: number;
  inspector: string;
  region: string;
  place: string;
  status: MissionStatus;
  x: number;
  y: number;
  time: string;
  date?: string | undefined;
  type?: string | undefined;
  priority?: 'normal' | 'high' | 'urgent' | undefined;
  targetUnit?: string | undefined;
  operatorName?: string | undefined;
  union: string;
  simbaCode?: string | undefined;
  complaintId?: number | undefined;
  source: MissionSource;
  notes?: string | undefined;
  completionReport?: MissionCompletionReport | undefined;
}

export interface Bakery {
  name: string;
  type: string;
  quota: number;
  received: number;
  used: number;
  status: string;
  x: number;
  y: number;
  neighborhood?: string | undefined;
  address?: string | undefined;
  operator?: string | undefined;
  lastInspectionDate?: string | undefined;
}

export interface AuditEntry {
  t: string;
  user: string;
  action: string;
  target: string;
  ip: string;
}

export interface LicenseInfo {
  readonly unitName: string;
  readonly holderName: string;
  readonly licenseNumber: string;
  readonly nationalId: string;
  readonly unionName: string;
  readonly issueDate: string;
  readonly address: string;
  readonly isValid: boolean;
}

export type Article27Status = 'pending' | 'verified' | 'investigate' | 'rejected';

export interface Article27Match {
  readonly id: number;
  readonly warningId: number;
  readonly unitName: string;
  readonly operatorName: string;
  readonly nationalId: string;
  readonly violationType: string;
  readonly address: string;
  readonly unionName: string;
  readonly guildCategory: string; // رسته شغلی
  readonly warningDate: string;
  readonly licenseInfo: LicenseInfo;
  status: Article27Status;
}

export type GraceStatus = 'in_grace' | 'near_expiry' | 'expired' | 'extended';

export interface GracePeriodUnit {
  readonly id: number;
  readonly unitId: number;
  readonly unitName: string;
  readonly operator: string;
  readonly mobile: string;
  readonly union: string;
  readonly warningDate: string;
  readonly graceStartDate: string;
  graceDays: number;
  daysRemaining: number;
  status: GraceStatus;
  smsNotified: boolean;
}

export interface UnsealLetter {
  readonly id: string;
  readonly unitId: number;
  readonly unitName: string;
  readonly operator: string;
  readonly letterNumber: string;
  readonly letterDate: string;
  readonly destination: string;
  readonly reason: string;
  readonly qrCode: string;
  readonly issuedBy: string;
}

export interface SmsLogEntry {
  readonly id: string;
  readonly recipientMobile: string;
  readonly recipientName: string;
  readonly unitName: string;
  readonly templateType:
    | 'warning'
    | 'grace_notice'
    | 'summons'
    | 'unseal'
    | 'complaint_registration'
    | 'complaint_status'
    | 'complaint_final';
  readonly messageSnippet: string;
  readonly sendTime: string;
  readonly gateway: 'Magfa' | 'Kavenegar';
  readonly deliveryStatus: 'delivered' | 'sent' | 'failed' | 'blacklisted';
}

export type ComplaintStage =
  | 'registered'
  | 'referred_to_inspection'
  | 'field_mission'
  | 'warning_issued'
  | 'summons_issued'
  | 'sealed'
  | 'resolved'
  | 'closed';

export const complaintStageLabels: Record<ComplaintStage, string> = {
  registered: '۱. ثبت شکایت و دریافت کد پیگیری',
  referred_to_inspection: '۲. ارجاع به سامانه بازرسی (bazras360)',
  field_mission: '۳. دریافت کارت مأموریت میدانی (/adr)',
  warning_issued: '۴. بازرسی میدانی و ثبت اخطار اولیه',
  summons_issued: '۵. صدور دعوتنامه رسمی و رسیدگی در مرجع',
  sealed: '۶. اجرای حکم پلمب اماکن',
  resolved: '۷. رفع تخلف و جلب رضایت شاکی',
  closed: '۷. مختومه و اعلام نتیجه نهایی به شاکی',
};

export interface ComplaintTimelineItem {
  readonly step: number;
  readonly title: string;
  readonly description: string;
  readonly date: string;
  readonly actor: string;
  readonly status: 'completed' | 'current' | 'pending';
}

export interface Complaint {
  readonly id: number;
  readonly trackingCode: string; // شماره پیگیری سامانه سیمبا
  readonly complainantName: string;
  readonly complainantMobile: string;
  readonly unitId?: number;
  readonly unitName: string;
  readonly operatorName: string;
  readonly nationalId?: string;
  readonly operatorMobile: string;
  readonly unionName: string;
  readonly region: string;
  readonly address: string;
  readonly violationSubject: string;
  readonly description: string;
  readonly registrationDate: string;
  stage: ComplaintStage;
  assignedInspector?: string;
  assignedDate?: string;
  warningNo?: string;
  warningDate?: string;
  summonsLetterNo?: string;
  summonsDate?: string;
  summonsHearingDate?: string;
  sealReportNo?: string;
  sealDate?: string;
  finalOutcome?: string;
  feedbackSentToSimba: boolean;
  feedbackDate?: string;
  timeline: ComplaintTimelineItem[];
}

export interface InspectorWarningReportItem {
  readonly id: number;
  readonly inspectorName: string;
  readonly unitName: string;
  readonly operatorName: string;
  readonly nationalId: string;
  readonly violationType: string;
  readonly address: string;
  readonly region: string;
  readonly registeredDate: string;
  readonly status: CaseStatus;
}

export interface OperatorFiveFields {
  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate: string;
  mobile: string;
}

export interface OperatorAuditLog {
  timestamp: string;
  operatorName: string;
  diffText: string;
  modifiedBy: string;
}

export type UnionCategory = 'distributive' | 'productive';

export interface UnionRegistryItem {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly category: UnionCategory;
  readonly categoryLabel: 'توزیعی - خدماتی' | 'تولیدی - خدماتی';
  readonly presidentName: string;
  readonly phone: string;
  readonly address: string;
  readonly activeMembersCount: number;
  readonly activeWarningsCount: number;
  readonly sealedCount: number;
  readonly usersCount: number;
}

export interface UnionUserAccount {
  readonly id: number;
  readonly unionId: number;
  readonly unionName: string;
  readonly fullName: string;
  readonly username: string;
  readonly nationalId: string;
  readonly mobile: string;
  readonly roleTitle: 'رئیس اتحادیه' | 'دبیر اجرایی' | 'کارشناس بازرسی' | 'کاربر پذیرش';
  isActive: boolean;
  password?: string;
  permissions: {
    canEditOperator: boolean;
    canDraftDismissal: boolean;
    canDraftSealRequest: boolean;
    canViewReports: boolean;
  };
}
