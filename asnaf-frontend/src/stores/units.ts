import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Unit,
  AuditEntry,
  Article27Match,
  Article27Status,
  GracePeriodUnit,
  UnsealLetter,
  SmsLogEntry,
  InspectorWarningReportItem,
  Complaint,
  ComplaintStage,
  Mission,
  MissionCompletionReport,
  OperatorFiveFields,
  OperatorAuditLog,
} from 'src/types/asnaf';
import {
  initialUnits,
  initialAuditLog,
  initialArticle27Matches,
  initialGracePeriodUnits,
  initialSmsLogs,
  initialInspectorWarnings,
  initialComplaints,
  missions as initialMissions,
} from 'src/utils/data';

export const useUnitsStore = defineStore('units', () => {
  const units = ref<Unit[]>([...initialUnits]);
  const auditLog = ref<AuditEntry[]>([...initialAuditLog]);
  const article27Matches = ref<Article27Match[]>([...initialArticle27Matches]);
  const graceUnits = ref<GracePeriodUnit[]>([...initialGracePeriodUnits]);
  const unsealLetters = ref<UnsealLetter[]>([]);
  const smsLogs = ref<SmsLogEntry[]>([...initialSmsLogs]);
  const inspectorWarnings = ref<InspectorWarningReportItem[]>([...initialInspectorWarnings]);
  const complaints = ref<Complaint[]>([...initialComplaints]);
  const missions = ref<Mission[]>([...initialMissions]);

  const missionStats = computed(() => {
    const total = missions.value.length;
    const active = missions.value.filter((m) => m.status === 'active').length;
    const pending = missions.value.filter((m) => m.status === 'pending_approval').length;
    const done = missions.value.filter((m) => m.status === 'done').length;
    return { total, active, pending, done };
  });

  function addMission(payload: Omit<Mission, 'id'>, user: string): Mission {
    const newId = missions.value.length > 0 ? Math.max(...missions.value.map((m) => m.id)) + 1 : 5040;
    const mission: Mission = {
      id: newId,
      ...payload,
    };
    missions.value.unshift(mission);
    addAudit(user, `تخصیص ماموریت جدید (کد ${newId})`, `بازرس ${payload.inspector} · ${payload.place}`);
    return mission;
  }

  // تخصیص ماموریت رسیدگی به شکایات سامانه سیمبا
  function assignComplaintMission(
    payload: {
      complaintId: number;
      inspector: string;
      priority: 'normal' | 'high' | 'urgent';
      time: string;
      notes?: string | undefined;
    },
    user: string
  ): Mission {
    const complaint = complaints.value.find((c) => c.id === payload.complaintId);
    if (!complaint) {
      throw new Error('شکایت مورد نظر یافت نشد.');
    }

    const nowStr = getPersianNow();
    complaint.stage = 'field_mission';
    complaint.assignedInspector = payload.inspector;
    complaint.assignedDate = nowStr;

    // ثبت در تاریخچه پیگیری شکایت
    if (complaint.timeline[1]) {
      complaint.timeline[1] = {
        ...complaint.timeline[1],
        status: 'completed',
        date: nowStr,
        description: `شکایت به بازرس ${payload.inspector} تخصیص یافت.`,
      };
    }
    if (complaint.timeline[2]) {
      complaint.timeline[2] = {
        ...complaint.timeline[2],
        status: 'completed',
        date: nowStr,
        description: `کارت مأموریت میدانی تحت کد رهگیری ${complaint.trackingCode} فعال شد.`,
      };
    }
    if (complaint.timeline[3]) {
      complaint.timeline[3] = {
        ...complaint.timeline[3],
        status: 'current',
        actor: payload.inspector,
      };
    }

    // استخراج محله از آدرس یا منطقه
    const placeCandidate = complaint.address.split('،')[0]?.trim() || complaint.region.replace(/منطقه \d+ \((.*?)\)/, '$1').trim() || 'مرکز شهر';

    const mission = addMission(
      {
        inspector: payload.inspector,
        region: complaint.region,
        place: placeCandidate,
        status: 'active',
        x: 45,
        y: 40,
        time: payload.time || '09:30',
        date: '۱۴۰۵/۰۸/۰۵',
        type: 'رسیدگی فوری به شکایت مردمی (سیمبا)',
        priority: payload.priority,
        targetUnit: complaint.unitName,
        operatorName: complaint.operatorName,
        union: complaint.unionName,
        simbaCode: complaint.trackingCode,
        complaintId: complaint.id,
        source: 'simba_complaint',
        notes: payload.notes || complaint.violationSubject,
      },
      user
    );

    addAudit(user, `تخصیص ماموریت شکایت سیمبا (${complaint.trackingCode}) به ${payload.inspector}`, complaint.unitName);
    return mission;
  }

  // تخصیص بازرسی و سرکشی واحدهای صنفی (فاقد کد سیمبا)
  function assignInspectionMission(
    payload: {
      targetUnit: string;
      operatorName?: string | undefined;
      union: string;
      place: string;
      region: string;
      inspector: string;
      type: string;
      priority: 'normal' | 'high' | 'urgent';
      time: string;
      notes?: string | undefined;
    },
    user: string
  ): Mission {
    const mission = addMission(
      {
        inspector: payload.inspector,
        region: payload.region,
        place: payload.place,
        status: 'active',
        x: 50,
        y: 45,
        time: payload.time || '10:00',
        date: '۱۴۰۵/۰۸/۰۵',
        type: payload.type || 'بازرسی نوبتی و تطبیق پروانه (ماده ۲۷)',
        priority: payload.priority,
        targetUnit: payload.targetUnit,
        operatorName: payload.operatorName,
        union: payload.union,
        simbaCode: undefined,
        complaintId: undefined,
        source: 'routine_inspection',
        notes: payload.notes || 'سرکشی دوره‌ای و بررسی پروانه کسب و رعایت نرخ‌نامه مصوب.',
      },
      user
    );

    addAudit(user, `تخصیص بازرسی واحد صنفی (${payload.targetUnit}) به ${payload.inspector}`, payload.union);
    return mission;
  }

  // ثبت گزارش ماموریت توسط بازرس و اعلام پایان ماموریت
  function submitMissionReport(missionId: number, report: MissionCompletionReport, user: string): void {
    const m = missions.value.find((item) => item.id === missionId);
    if (!m) return;

    m.status = 'pending_approval';
    m.completionReport = report;

    // اگر متصل به شکایت بود، مرحله شکایت را به صدور اخطار / بررسی ارتقا می‌دهیم
    if (m.complaintId) {
      const complaint = complaints.value.find((c) => c.id === m.complaintId);
      if (complaint) {
        complaint.stage = 'warning_issued';
        if (complaint.timeline[3]) {
          complaint.timeline[3] = {
            ...complaint.timeline[3],
            status: 'completed',
            date: getPersianNow(),
            description: `گزارش بازرسی شماره ${report.letterNumber} توسط بازرس ثبت شد و جهت بررسی نهایی به اتحادیه ارجاع گردید.`,
          };
        }
        if (complaint.timeline[4]) {
          complaint.timeline[4] = {
            ...complaint.timeline[4],
            status: 'current',
          };
        }
      }
    }

    addAudit(user, `ثبت گزارش پایان ماموریت ${missionId} و ارسال به اتحادیه`, `نامه ${report.letterNumber}`);
  }

  // تایید پایان ماموریت از سمت اتحادیه و ارسال اعلان به اتاق اصناف
  function approveMissionReport(missionId: number, user: string): void {
    const m = missions.value.find((item) => item.id === missionId);
    if (!m) return;

    const nowStr = getPersianNow();
    m.status = 'done';
    if (m.completionReport) {
      m.completionReport = {
        ...m.completionReport,
        approvedBy: user,
        approvedAt: nowStr,
      };
    }

    if (m.complaintId) {
      const complaint = complaints.value.find((c) => c.id === m.complaintId);
      if (complaint) {
        complaint.stage = 'resolved';
        complaint.feedbackSentToSimba = true;
        complaint.feedbackDate = nowStr;
        if (complaint.timeline[6]) {
          complaint.timeline[6] = {
            ...complaint.timeline[6],
            status: 'completed',
            date: nowStr,
            description: `پرونده با تأیید اتحادیه ${m.union} نهایی شد و بازخورد رسمی به سامانه سیمبا منعکس گردید.`,
          };
        }
      }
    }

    addAudit(user, `تایید پایان ماموریت کد ${missionId} توسط اتحادیه و اعلان به اتاق اصناف`, m.targetUnit || m.place);
  }

  function toggleMissionStatus(id: number, user: string): void {
    const m = missions.value.find((item) => item.id === id);
    if (!m) return;
    m.status = m.status === 'done' ? 'active' : 'done';
    const statusLabel = m.status === 'done' ? 'تکمیل ماموریت بازرسی' : 'فعال‌سازی مجدد ماموریت';
    addAudit(user, statusLabel, `ماموریت کد ${id} (${m.place})`);
  }

  function getPersianNow(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `۱۴۰۵/۰۸/۰۵ ${hours}:${mins}`;
  }

  function updateUnit(id: number, patch: Partial<Unit>): void {
    units.value = units.value.map((u) => (u.id === id ? { ...u, ...patch } : u));
  }

  function addAudit(user: string, action: string, target: string): void {
    auditLog.value.unshift({
      t: getPersianNow(),
      user,
      action,
      target,
      ip: '10.12.4.21',
    });
  }

  function addSms(
    recipientMobile: string,
    recipientName: string,
    unitName: string,
    templateType: SmsLogEntry['templateType'],
    messageSnippet: string,
    gateway: 'Magfa' | 'Kavenegar' = 'Magfa'
  ): void {
    const newSms: SmsLogEntry = {
      id: `SMS-${Math.floor(10000 + Math.random() * 90000)}`,
      recipientMobile,
      recipientName,
      unitName,
      templateType,
      messageSnippet,
      sendTime: getPersianNow(),
      gateway,
      deliveryStatus: 'delivered',
    };
    smsLogs.value.unshift(newSms);
  }

  // --- Complaint End-to-End Workflow Actions ---

  // ۱. ثبت شکایت و دریافت کد پیگیری
  function registerComplaint(payload: {
    complainantName: string;
    complainantMobile: string;
    unitName: string;
    operatorName: string;
    operatorMobile: string;
    unionName: string;
    region: string;
    address: string;
    violationSubject: string;
    description: string;
  }): Complaint {
    const newId = complaints.value.length > 0 ? Math.max(...complaints.value.map((c) => c.id)) + 1 : 1;
    const randomTrack = String(Math.floor(1000000000 + Math.random() * 9000000000));
    const nowStr = getPersianNow();

    const newComplaint: Complaint = {
      id: newId,
      trackingCode: randomTrack,
      complainantName: payload.complainantName,
      complainantMobile: payload.complainantMobile,
      unitName: payload.unitName,
      operatorName: payload.operatorName,
      operatorMobile: payload.operatorMobile,
      unionName: payload.unionName,
      region: payload.region,
      address: payload.address,
      violationSubject: payload.violationSubject,
      description: payload.description,
      registrationDate: nowStr,
      stage: 'registered',
      feedbackSentToSimba: false,
      timeline: [
        {
          step: 1,
          title: 'ثبت شکایت و دریافت کد پیگیری',
          description: `شکایت در سامانه سیمبا ثبت شد. کد پیگیری رسمی: ${randomTrack}`,
          date: nowStr,
          actor: 'شاکی (درگاه سیمبا)',
          status: 'completed',
        },
        {
          step: 2,
          title: 'ارجاع به سامانه مدیریت بازرسی (bazras360)',
          description: 'در حال دسته‌بندی موضوعی و ارجاع مکانی به کارتابل بازرس منطقه.',
          date: '—',
          actor: 'سامانه bazras360',
          status: 'current',
        },
        {
          step: 3,
          title: 'دریافت کارت مأموریت در اپلیکیشن میدانی (/adr)',
          description: 'در انتظار اعزام و صدور مأموریت میدانی.',
          date: '—',
          actor: 'اپلیکیشن میدانی بازرس',
          status: 'pending',
        },
        {
          step: 4,
          title: 'بازرسی میدانی و ثبت اخطار اولیه',
          description: 'مراجعه بازرس، تطبیق پروانه و ثبت اخطار در صورت احراز تخلف.',
          date: '—',
          actor: 'بازرس میدانی',
          status: 'pending',
        },
        {
          step: 5,
          title: 'ارسال دعوتنامه و رسیدگی به تخلف در مرجع مربوطه',
          description: 'دعوتنامه حضور در مرجع رسیدگی و بررسی اسناد.',
          date: '—',
          actor: 'اتحادیه / کمیسیون رسیدگی',
          status: 'pending',
        },
        {
          step: 6,
          title: 'اجرای حکم پلمب',
          description: 'اجرای دستور پلمب در صورت استمرار تخلف یا عدم همکاری.',
          date: '—',
          actor: 'پلیس نظارت بر اماکن',
          status: 'pending',
        },
        {
          step: 7,
          title: 'ثبت خروجی پرونده و اطلاع‌رسانی به شاکی',
          description: 'اعلام خروجی نهایی پرونده به شاکی و عودت بازخورد به سامانه سیمبا.',
          date: '—',
          actor: 'سامانه مرکزی نظارت اصناف',
          status: 'pending',
        },
      ],
    };

    complaints.value.unshift(newComplaint);

    // ارسال پیامک کد رهگیری به شاکی
    addSms(
      payload.complainantMobile,
      payload.complainantName,
      payload.unitName,
      'complaint_registration',
      `شاکی گرامی، شکایت شما از واحد ${payload.unitName} با کد پیگیری ${randomTrack} ثبت شد و در چرخه بازرسی اصناف قرار گرفت.`
    );

    addAudit('سامانه سیمبا', 'ثبت شکایت مردمی', `کد ${randomTrack} (${payload.unitName})`);
    return newComplaint;
  }

  // ۲. ارجاع به سامانه مدیریت بازرسی (bazras360) و ۳. دریافت کارت ماموریت میدانی (/adr)
  function referComplaintToInspection(complaintId: number, inspectorName: string, region: string, user: string): void {
    const item = complaints.value.find((c) => c.id === complaintId);
    if (!item) return;

    const nowStr = getPersianNow();
    item.stage = 'field_mission';
    item.assignedInspector = inspectorName;
    item.assignedDate = nowStr;

    // Timeline updates
    item.timeline[1] = {
      step: 2,
      title: 'ارجاع به سامانه مدیریت بازرسی (bazras360)',
      description: `پرونده به منطقه ${region} و بازرس ${inspectorName} تخصیص یافت.`,
      date: nowStr,
      actor: user || 'مدیریت بازرسی bazras360',
      status: 'completed',
    };
    item.timeline[2] = {
      step: 3,
      title: 'دریافت کارت مأموریت در اپلیکیشن میدانی (/adr)',
      description: `کارت مأموریت تحت عنوان ارجاع از شکایات (سیمبا) با کد ${item.trackingCode} روی اپلیکیشن بازرس فعال شد.`,
      date: nowStr,
      actor: `اپلیکیشن میدانی (${inspectorName})`,
      status: 'completed',
    };
    item.timeline[3] = {
      step: 4,
      title: 'بازرسی میدانی و ثبت اخطار اولیه',
      description: 'بازرس در حال بررسی و مراجعه میدانی به نشانی واحد صنفی است.',
      date: '—',
      actor: inspectorName,
      status: 'current',
    };

    // اگر واحد صنفی در لیست عمومی نبود یا سیمبا نداشت، همگام‌سازی شود تا در صفحه /field نمایش یابد
    let linkedUnit = units.value.find((u) => u.name === item.unitName || (item.unitId && u.id === item.unitId));
    if (linkedUnit) {
      linkedUnit.simba = item.trackingCode;
      linkedUnit.status = 'warning';
    } else {
      const newUnitId = Math.floor(17000 + Math.random() * 2000);
      const newUnit: Unit = {
        id: newUnitId,
        name: item.unitName,
        operator: item.operatorName,
        nationalId: item.nationalId ?? '1750000000',
        mobile: item.operatorMobile,
        union: item.unionName,
        region: item.region,
        address: item.address,
        violation: item.violationSubject,
        status: 'warning',
        simba: item.trackingCode,
        date: '۱۴۰۵/۰۸/۰۵',
        distance: 1.5,
        x: 45,
        y: 40,
        risk: {
          noLicense: false,
          complaints: 1,
          nonCooperation: false,
          noSign: false,
          warningExpired: false,
        },
      };
      units.value.unshift(newUnit);
      linkedUnit = newUnit;
    }

    addAudit(user, `ارجاع شکایت به بازرس ${inspectorName} در bazras360`, `کد ${item.trackingCode}`);
  }

  // ۴. بازرسی میدانی و ثبت اخطار اولیه
  function issueComplaintWarning(
    complaintId: number,
    payload: { warningNo: string; warningDate: string },
    user: string
  ): void {
    const item = complaints.value.find((c) => c.id === complaintId);
    if (!item) return;

    const nowStr = getPersianNow();
    item.stage = 'warning_issued';
    item.warningNo = payload.warningNo;
    item.warningDate = payload.warningDate;

    item.timeline[3] = {
      step: 4,
      title: 'بازرسی میدانی و ثبت اخطار اولیه اماکن',
      description: `بازرس در محل حضور یافت؛ مشخصات متصدی تطبیق داده شد و فرم اخطار اماکن به شماره ${payload.warningNo} صادر گردید.`,
      date: payload.warningDate || nowStr,
      actor: user,
      status: 'completed',
    };
    item.timeline[4] = {
      step: 5,
      title: 'ارسال دعوتنامه و رسیدگی به تخلف در مرجع مربوطه',
      description: 'در صورت عدم تمکین، پرونده جهت صدور دعوتنامه رسمی به اتحادیه ارجاع خواهد شد.',
      date: '—',
      actor: item.unionName,
      status: 'current',
    };

    // اگر واحد در لیست اصلی باشد، شماره اخطار و وضعیت ست شود
    const linkedUnit = units.value.find((u) => u.simba === item.trackingCode || u.name === item.unitName);
    if (linkedUnit) {
      linkedUnit.warningNo = payload.warningNo;
      linkedUnit.status = 'warning';
    }

    // ارسال پیامک اخطار به متصدی
    addSms(
      item.operatorMobile,
      item.operatorName,
      item.unitName,
      'warning',
      `متصدی محترم ${item.unitName}، اخطار اولیه بازرسی اماکن و اصناف به شماره ${payload.warningNo} پیرو شکایت ${item.trackingCode} برای شما صادر گردید.`
    );

    addAudit(user, `ثبت اخطار اماکن ${payload.warningNo}`, `شکایت ${item.trackingCode} (${item.unitName})`);
  }

  // ۵. ارسال دعوتنامه و رسیدگی به تخلف در مرجع مربوطه
  function issueComplaintSummons(
    complaintId: number,
    payload: { summonsNo: string; summonsDate: string; hearingDate: string; chamber: string },
    user: string
  ): void {
    const item = complaints.value.find((c) => c.id === complaintId);
    if (!item) return;

    const nowStr = getPersianNow();
    item.stage = 'summons_issued';
    item.summonsLetterNo = payload.summonsNo;
    item.summonsDate = payload.summonsDate;
    item.summonsHearingDate = payload.hearingDate;

    item.timeline[4] = {
      step: 5,
      title: 'صدور دعوتنامه رسمی و رسیدگی به تخلف در مرجع مربوطه',
      description: `دعوتنامه شماره ${payload.summonsNo} جهت حضور در ${payload.chamber} در تاریخ ${payload.hearingDate} صادر گردید.`,
      date: payload.summonsDate || nowStr,
      actor: user,
      status: 'completed',
    };
    item.timeline[5] = {
      step: 6,
      title: 'اجرای حکم پلمب (در صورت عدم همکاری یا استمرار تخلف)',
      description: 'در صورت عدم حضور متصدی در جلسه یا عدم حل اختلاف، حکم پلمب اماکن اجرا خواهد شد.',
      date: '—',
      actor: 'پلیس نظارت بر اماکن عمومی',
      status: 'current',
    };

    // پیامک احضار به متصدی
    addSms(
      item.operatorMobile,
      item.operatorName,
      item.unitName,
      'summons',
      `متصدی محترم ${item.unitName}، دعوتنامه رسیدگی به تخلفات شماره ${payload.summonsNo} صادر شد. جلسه رسیدگی: ${payload.hearingDate} در ${payload.chamber}.`
    );

    addAudit(user, `صدور دعوتنامه رسیدگی ${payload.summonsNo}`, `واحد ${item.unitName}`);
  }

  // ۶. اجرای حکم پلمب (در صورت عدم همکاری یا استمرار تخلف)
  function executeComplaintSeal(
    complaintId: number,
    payload: { sealReportNo: string; sealDate: string },
    user: string
  ): void {
    const item = complaints.value.find((c) => c.id === complaintId);
    if (!item) return;

    const nowStr = getPersianNow();
    item.stage = 'sealed';
    item.sealReportNo = payload.sealReportNo;
    item.sealDate = payload.sealDate;

    item.timeline[5] = {
      step: 6,
      title: 'اجرای حکم پلمب واحد صنفی',
      description: `به دلیل عدم همکاری یا استمرار تخلف، حکم پلمب با صورتمجلس شماره ${payload.sealReportNo} در محل اجرا و ثبت شد.`,
      date: payload.sealDate || nowStr,
      actor: user,
      status: 'completed',
    };
    item.timeline[6] = {
      step: 7,
      title: 'ثبت خروجی پرونده و اطلاع‌رسانی به شاکی',
      description: 'آماده ثبت خروجی، عودت بازخورد به سامانه سیمبا و ارسال پیامک نتیجه نهایی به شاکی.',
      date: '—',
      actor: 'سامانه نظارت اصناف',
      status: 'current',
    };

    const linkedUnit = units.value.find((u) => u.simba === item.trackingCode || u.name === item.unitName);
    if (linkedUnit) {
      linkedUnit.status = 'sealed';
    }

    // پیامک به متصدی
    addSms(
      item.operatorMobile,
      item.operatorName,
      item.unitName,
      'warning',
      `متصدی محترم ${item.unitName}، حکم پلمب واحد صنفی با صورتمجلس ${payload.sealReportNo} اجرا و ثبت گردید.`
    );

    addAudit(user, `اجرای حکم پلمب ${payload.sealReportNo}`, `واحد ${item.unitName}`);
  }

  // ۷. ثبت خروجی پرونده و اطلاع‌رسانی به شاکی و بازخورد به سیمبا
  function finalizeComplaint(
    complaintId: number,
    payload: { outcome: string; notes?: string },
    user: string
  ): void {
    const item = complaints.value.find((c) => c.id === complaintId);
    if (!item) return;

    const nowStr = getPersianNow();
    item.stage = 'closed';
    item.finalOutcome = payload.outcome;
    item.feedbackSentToSimba = true;
    item.feedbackDate = nowStr;

    item.timeline[6] = {
      step: 7,
      title: 'ثبت خروجی نهایی پرونده و اطلاع‌رسانی به شاکی و سیمبا',
      description: `نتیجه نهایی: «${payload.outcome}». بازخورد با موفقیت به سامانه سیمبا منعکس شد و پیامک نتیجه برای شاکی و متصدی ارسال گردید.`,
      date: nowStr,
      actor: user,
      status: 'completed',
    };

    // ارسال پیامک نتیجه نهایی به شاکی
    addSms(
      item.complainantMobile,
      item.complainantName,
      item.unitName,
      'complaint_final',
      `شاکی گرامی، رسیدگی به پرونده شکایت ${item.trackingCode} از واحد ${item.unitName} پایان یافت. نتیجه قطعی: ${payload.outcome}. از همکاری شما در نظارت مردمی سپاسگزاریم.`
    );

    // ارسال پیامک اعلام رأی به متصدی
    addSms(
      item.operatorMobile,
      item.operatorName,
      item.unitName,
      'complaint_final',
      `متصدی محترم ${item.unitName}، پرونده شکایت ${item.trackingCode} با نتیجه «${payload.outcome}» تعیین تکلیف نهایی گردید.`
    );

    addAudit(user, `ثبت خروجی نهایی شکایت (${payload.outcome}) و اعلام به سیمبا`, `کد پیگیری ${item.trackingCode}`);
  }

  function getComplaintByTracking(query: string): Complaint | undefined {
    const clean = query.trim().toLowerCase();
    if (!clean) return undefined;
    return complaints.value.find(
      (c) =>
        c.trackingCode.toLowerCase().includes(clean) ||
        c.complainantMobile.includes(clean) ||
        c.unitName.toLowerCase().includes(clean) ||
        c.operatorName.toLowerCase().includes(clean)
    );
  }

  // --- Article 27 Actions ---
  function updateArticle27Status(id: number, status: Article27Status, user: string): void {
    const item = article27Matches.value.find((m) => m.id === id);
    if (!item) return;
    item.status = status;
    const actionLabel =
      status === 'verified'
        ? 'تأیید تطبیق ماده ۲۷'
        : status === 'investigate'
        ? 'ارجاع به بررسی میدانی'
        : 'رد تطبیق ماده ۲۷';
    addAudit(user, actionLabel, `اخطار ${item.warningId} (${item.unitName})`);

    if (status === 'verified') {
      updateUnit(item.warningId, { status: 'licensed' });
    } else if (status === 'rejected') {
      updateUnit(item.warningId, { status: 'readySeal' });
    }
  }

  function extendGrace(id: number, extraDays: number, user: string): void {
    const item = graceUnits.value.find((g) => g.id === id);
    if (!item) return;
    item.graceDays += extraDays;
    item.daysRemaining += extraDays;
    item.status = 'extended';
    addAudit(user, `تمدید امهال به مدت ${extraDays} روز`, `واحد ${item.unitId} (${item.unitName})`);
  }

  function sendGraceSms(id: number, user: string): void {
    const item = graceUnits.value.find((g) => g.id === id);
    if (!item) return;
    item.smsNotified = true;
    addSms(
      item.mobile,
      item.operator,
      item.unitName,
      'grace_notice',
      `متصدی گرامی، مهلت قانونی پرونده امهال واحد صنفی ${item.unitName} در حال اتمام است.`
    );
    addAudit(user, 'ارسال پیامک تذکر امهال', `موبایل ${item.mobile}`);
  }

  function referToSeal(id: number, user: string): void {
    const item = graceUnits.value.find((g) => g.id === id);
    if (!item) return;
    item.daysRemaining = 0;
    item.status = 'expired';
    updateUnit(item.unitId, { status: 'readySeal' });
    addAudit(user, 'ارجاع امهال منقضی‌شده به پلمپ', `واحد ${item.unitId} (${item.unitName})`);
  }

  function issueUnsealLetter(letter: UnsealLetter, user: string): void {
    unsealLetters.value.unshift(letter);
    updateUnit(letter.unitId, { status: 'licensed' });
    addAudit(user, `صدور نامه فک پلمپ ${letter.letterNumber}`, `واحد ${letter.unitId} (${letter.unitName})`);
  }

  // --- چرخه حیات ۶ مرحله‌ای بازرسی (مطابق requirements_analysis_document.md) ---

  // گام ۱ و ۲: ارجاع به اماکن و صدور اخطار ثانویه (۱۰ روزه)
  function escalateToAmaken(unitId: number, inspector: string, user: string): void {
    const u = units.value.find((item) => item.id === unitId);
    if (!u) return;
    const nowStr = getPersianNow();
    u.status = 'warning_2';
    u.warning2Date = nowStr;

    addSms(
      u.mobile,
      u.operator,
      u.name,
      'warning',
      `اخطار ثانویه و نهایی؛ متصدی واحد صنفی ${u.name}؛ نظر به انقضای مهلت ۳ روزه، پرونده در نوبت پلمپ قرار گرفت. فوراً ظرف مهلت نهایی ۱۰ روز به اتحادیه مربوطه مراجعه نمایید.`
    );

    addAudit(user, `ارجاع به اداره اماکن و صدور اخطار ثانویه (بازرس: ${inspector})`, `واحد ${u.id} (${u.name})`);
  }

  // گام ۳: مدال ویرایش ۵ قلم داده با لاگ ممیزی مقایسه‌ای سخت‌گیرانه
  function editOperatorWithAudit(unitId: number, fields: OperatorFiveFields, user: string): OperatorAuditLog {
    const u = units.value.find((item) => item.id === unitId);
    if (!u) {
      throw new Error('واحد صنفی یافت نشد');
    }

    const diffParts: string[] = [];
    const newFullName = `${fields.firstName.trim()} ${fields.lastName.trim()}`.trim();
    const oldFullName = u.operator;

    if (newFullName && newFullName !== oldFullName) {
      diffParts.push(`نام و نام خانوادگی از «${oldFullName}» به «${newFullName}» تغییر یافت.`);
    }

    if (fields.nationalId && fields.nationalId !== u.nationalId) {
      diffParts.push(`کد ملی از «${u.nationalId}» به «${fields.nationalId}» تغییر یافت.`);
    }

    const oldMobile = u.mobile;
    const mobileChanged = fields.mobile && fields.mobile !== oldMobile;
    if (mobileChanged) {
      diffParts.push(`شماره موبایل از «${oldMobile}» به «${fields.mobile}» تغییر یافت.`);
    }

    if (fields.birthDate && fields.birthDate !== u.birthDate) {
      diffParts.push(`تاریخ تولد به «${fields.birthDate}» به‌روزرسانی شد.`);
    }

    const logEntry: OperatorAuditLog = {
      timestamp: getPersianNow(),
      operatorName: newFullName || oldFullName,
      diffText: diffParts.length > 0 ? diffParts.join('\n') : 'مشخصات متصدی بررسی و بدون تغییر تایید شد.',
      modifiedBy: user,
    };

    // اعمال تغییرات صرفاً در ۵ قلم داده
    if (newFullName) u.operator = newFullName;
    if (fields.nationalId) u.nationalId = fields.nationalId;
    if (fields.mobile) u.mobile = fields.mobile;
    if (fields.birthDate) u.birthDate = fields.birthDate;

    if (!u.auditTrail) {
      u.auditTrail = [];
    }
    u.auditTrail.unshift(logEntry);

    // اگر شماره موبایل تغییر کرده بود، پیامک اخطار مجدد صرفاً به شماره جدید ارسال می‌شود
    if (mobileChanged) {
      addSms(
        u.mobile,
        u.operator,
        u.name,
        'warning',
        `متصدی محترم ${u.operator}؛ مشخصات شما در سامانه بازرسی اصناف به‌روزرسانی شد. پرونده واحد صنفی ${u.name} در دست اقدام قانونی است.`
      );
    }

    addAudit(user, 'ویرایش مشخصات متصدی (۵ قلم داده)', `واحد ${u.id} (${u.name})`);
    return logEntry;
  }

  // گام ۴: درخواست پلمپ توسط اتحادیه پس از انقضای ۱۰ روز
  function requestSealByUnion(unitId: number, user: string): void {
    const u = units.value.find((item) => item.id === unitId);
    if (!u) return;

    u.status = 'seal_requested';
    u.sealRequestedDate = getPersianNow();

    addAudit(user, `صدور نامه درخواست پلمپ توسط اتحادیه و ارسال به اتاق اصناف`, `واحد ${u.id} (${u.name})`);
  }

  // گام ۵: صدور دستور پلمپ توسط اتاق اصناف و ارجاع به اداره نظارت بر اماکن
  function issueChamberSealOrder(unitId: number, sealOrderNo: string, user: string): void {
    const u = units.value.find((item) => item.id === unitId);
    if (!u) return;

    u.status = 'seal_ordered';
    u.sealOrderNo = sealOrderNo;
    u.sealOrderDate = getPersianNow();

    addSms(
      u.mobile,
      u.operator,
      u.name,
      'warning',
      `دستور رسمی پلمپ واحد صنفی ${u.name} به علت استمرار تخلف صادر و به اداره نظارت بر اماکن عمومی تحویل گردید. شناسه ارجاع: ${sealOrderNo}`
    );

    addAudit(user, `صدور رسمی دستور پلمپ و ابلاغ به اماکن (نامه ${sealOrderNo})`, `واحد ${u.id} (${u.name})`);
  }

  // گام ۶: اجرای میدانی پلمپ در محل توسط بازرس اماکن
  function executeFieldSeal(unitId: number, reportNo: string, inspector: string): void {
    const u = units.value.find((item) => item.id === unitId);
    if (!u) return;

    u.status = 'sealed';
    u.amakenReportNo = reportNo;
    u.sealExecutionDate = getPersianNow();

    addSms(
      u.mobile,
      u.operator,
      u.name,
      'warning',
      `حکم پلمپ واحد صنفی ${u.name} با صورتمجلس شماره ${reportNo} توسط بازرس اماکن در محل اجرا گردید.`
    );

    addAudit(inspector, `اجرای میدانی حکم پلمپ اماکن (صورتمجلس ${reportNo})`, `واحد ${u.id} (${u.name})`);
  }

  // مسیر حل‌وفصل: ثبت پیش‌نویس نامه رفع تخلف توسط اتحادیه
  function submitUnionDismissalDraft(
    unitId: number,
    resolutionType: 'dismissal' | 'unseal',
    feeTrackingCode: string,
    graceEndDate: string,
    user: string
  ): void {
    const u = units.value.find((item) => item.id === unitId);
    if (!u) return;

    u.resolutionType = resolutionType;
    u.fineTrackingCode = feeTrackingCode;
    u.graceEndDate = graceEndDate;

    addAudit(
      user,
      `صدور پیش‌نویس نامه ${resolutionType === 'dismissal' ? 'منع پیگیری' : 'فک پلمپ'} با شناسه پرداخت جریمه ${feeTrackingCode}`,
      `واحد ${u.id} (${u.name})`
    );
  }

  // مسیر حل‌وفصل: تایید نهایی، ممهور نمودن به مهر اجرائیات اتاق و ابلاغ به اماکن
  function approveChamberResolution(
    unitId: number,
    resolutionType: 'dismissal' | 'unseal',
    letterNo: string,
    user: string
  ): void {
    const u = units.value.find((item) => item.id === unitId);
    if (!u) return;

    u.status = resolutionType === 'dismissal' ? 'dismissed' : 'unsealed';
    u.resolutionLetterNo = letterNo;
    u.resolutionDate = getPersianNow();

    addSms(
      u.mobile,
      u.operator,
      u.name,
      'unseal',
      `پرونده صنفی واحد ${u.name} با موافقت اتحادیه و تایید اتاق اصناف به وضعیت ${resolutionType === 'dismissal' ? 'منع پیگیری' : 'فک پلمپ'} تغییر یافت. شناسه ابلاغ: ${letterNo}`
    );

    addAudit(
      user,
      `تایید و ممهور نمودن نامه ${resolutionType === 'dismissal' ? 'منع پیگیری' : 'فک پلمپ'} با مهر اجرائیات و ابلاغ به اماکن`,
      `واحد ${u.id} (${u.name})`
    );
  }

  // موتور هوشمند تطبیق پروانه کسب ماده ۲۷ و تصفیه خودکار پرونده‌ها
  function autoReconcileArticle27(nationalId: string, licenseNumber: string, user: string): number {
    let reconciledCount = 0;
    const nowStr = getPersianNow();

    units.value.forEach((u) => {
      if (
        u.nationalId === nationalId &&
        (u.status === 'warning_1' ||
          u.status === 'warning_2' ||
          u.status === 'seal_requested' ||
          u.status === 'seal_ordered' ||
          u.status === 'warning' ||
          u.status === 'readySeal')
      ) {
        u.status = 'dismissed';
        u.resolutionType = 'dismissal';
        u.resolutionLetterNo = `LIC-${licenseNumber}`;
        u.resolutionDate = nowStr;

        const auditDiff: OperatorAuditLog = {
          timestamp: nowStr,
          operatorName: u.operator,
          diffText: `تطبیق هوشمند ماده ۲۷: پروانه کسب رسمی به شماره ${licenseNumber} احراز گردید و پرونده خودکار از صف اخطار خارج و به منع پیگیری منتقل شد.`,
          modifiedBy: 'موتور هوشمند تطبیق ماده ۲۷',
        };

        if (!u.auditTrail) u.auditTrail = [];
        u.auditTrail.unshift(auditDiff);

        addSms(
          u.mobile,
          u.operator,
          u.name,
          'unseal',
          `پرونده تخلف ماده ۲۷ واحد صنفی ${u.name} با استعلام پروانه کسب رسمی ${licenseNumber} مختومه و به بایگانی منع پیگیری منتقل گردید.`
        );

        reconciledCount++;
      }
    });

    if (reconciledCount > 0) {
      addAudit(user, `تطبیق خودکار ماده ۲۷ با شماره پروانه ${licenseNumber} (${reconciledCount} واحد)`, `کد ملی ${nationalId}`);
    }

    return reconciledCount;
  }

  // مرحله ۱: ثبت سرکشی میدانی بازرس و صدور اخطار بدوی (۷۲ ساعته)
  function registerFieldInspection(payload: {
    name: string;
    hasSign: boolean;
    operator: string;
    nationalId: string;
    mobile: string;
    birthDate?: string | undefined;
    union: string;
    region: string;
    address: string;
    postalCode?: string | undefined;
    violation: string;
    warningNo: string;
    nonCooperation: boolean;
    notes?: string | undefined;
    inspector: string;
    x?: number | undefined;
    y?: number | undefined;
  }): Unit {
    const nextId = Math.max(...units.value.map((u) => u.id), 10000) + 1;
    const nowStr = getPersianNow();
    const cleanDate = nowStr.split(' ')[0] || '۱۴۰۵/۰۸/۱۴';

    const newUnit: Unit = {
      id: nextId,
      name: payload.name.trim() || 'واحد صنفی فاقد تابلو',
      operator: payload.operator.trim(),
      nationalId: payload.nationalId.trim(),
      mobile: payload.mobile.trim(),
      birthDate: payload.birthDate,
      union: payload.union,
      region: payload.region,
      address: payload.address.trim(),
      violation: payload.violation || 'فاقد پروانه کسب (ماده ۲۷)',
      status: 'warning_1',
      warningNo: payload.warningNo.trim() || `۱۴۰۵-ب-${nextId}`,
      date: cleanDate,
      warning1Date: cleanDate,
      distance: 1.2,
      x: payload.x ?? 48,
      y: payload.y ?? 42,
      notes: payload.notes,
      risk: {
        noLicense: payload.violation.includes('پروانه') || true,
        complaints: 0,
        nonCooperation: payload.nonCooperation,
        noSign: !payload.hasSign,
        warningExpired: false,
      },
      auditTrail: [
        {
          timestamp: nowStr,
          operatorName: payload.operator,
          diffText: `واحد با اخطار بدوی شماره ${payload.warningNo} ثبت شد. متصدی: ${payload.operator}، تخلف: ${payload.violation}. مهلت قانونی ۷۲ ساعت.`,
          modifiedBy: payload.inspector,
        },
      ],
    };

    units.value.unshift(newUnit);

    // افزودن رکورد مأموریت سرکشی
    addMission(
      {
        inspector: payload.inspector,
        region: payload.region,
        place: payload.address.split('،')[0]?.trim() || payload.region,
        status: 'active',
        x: newUnit.x,
        y: newUnit.y,
        time: '10:30',
        date: cleanDate,
        type: 'سرکشی میدانی و اخطار بدوی ۷۲ ساعته',
        priority: payload.nonCooperation ? 'urgent' : 'high',
        targetUnit: newUnit.name,
        operatorName: newUnit.operator,
        union: newUnit.union,
        source: 'routine_inspection',
        notes: payload.notes || `صدور اخطاریه بدوی به شماره ${newUnit.warningNo}. ${payload.violation}`,
      },
      payload.inspector
    );

    // ارسال پیامک اخطار بدوی
    addSms(
      newUnit.mobile,
      newUnit.operator,
      newUnit.name,
      'warning',
      `متصدی محترم واحد ${newUnit.name}، اخطاریه بدوی ۷۲ ساعته به شماره ${newUnit.warningNo} به علت ${payload.violation} صادر گردید. مهلت قانونی جهت اخذ پروانه و مراجعه به اتحادیه: ۷۲ ساعت.`
    );

    // ثبت لاگ ممیزی
    addAudit(
      payload.inspector,
      'ثبت سرکشی میدانی و صدور اخطاریه بدوی (مرحله ۱)',
      `واحد ${newUnit.id} (${newUnit.name}) - ${newUnit.union}`
    );

    return newUnit;
  }

  return {
    units,
    auditLog,
    article27Matches,
    graceUnits,
    unsealLetters,
    smsLogs,
    inspectorWarnings,
    complaints,
    missions,
    missionStats,
    addMission,
    assignComplaintMission,
    assignInspectionMission,
    submitMissionReport,
    approveMissionReport,
    toggleMissionStatus,
    updateUnit,
    addAudit,
    addSms,
    registerComplaint,
    referComplaintToInspection,
    issueComplaintWarning,
    issueComplaintSummons,
    executeComplaintSeal,
    finalizeComplaint,
    getComplaintByTracking,
    updateArticle27Status,
    extendGrace,
    sendGraceSms,
    referToSeal,
    issueUnsealLetter,
    escalateToAmaken,
    editOperatorWithAudit,
    requestSealByUnion,
    issueChamberSealOrder,
    executeFieldSeal,
    submitUnionDismissalDraft,
    approveChamberResolution,
    autoReconcileArticle27,
    registerFieldInspection,
  };
});

