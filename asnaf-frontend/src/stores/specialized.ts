import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  SpecializedUnionConfig,
  SpecializedUnitItem,
  CreateUnionPayload,
} from 'src/types/specialized';
import { specializedUnionsConfig, specializedUnitsData } from 'src/utils/specializedData';
import { fa } from 'src/utils/fa';

export const useSpecializedStore = defineStore('specialized', () => {
  // بارگذاری اتحادیه‌ها و واحدهای سفارشی از localStorage
  const customUnions = ref<Record<string, SpecializedUnionConfig>>({});
  const customUnits = ref<SpecializedUnitItem[]>([]);

  function loadPersistedData(): void {
    try {
      const savedUnions = localStorage.getItem('asnaf_custom_unions');
      if (savedUnions) {
        customUnions.value = JSON.parse(savedUnions);
      }
      const savedUnits = localStorage.getItem('asnaf_custom_units');
      if (savedUnits) {
        customUnits.value = JSON.parse(savedUnits);
      }
    } catch {
      // ignore JSON parse error
    }
  }

  loadPersistedData();

  // تجمیع اتحادیه‌های پیش‌فرض و اتحادیه‌های تعریف‌شده توسط کاربر
  const unions = computed<Record<string, SpecializedUnionConfig>>(() => {
    return {
      ...specializedUnionsConfig,
      ...customUnions.value,
    };
  });

  // تجمیع واحدهای صنفی پیش‌فرض و واحدهای جدید
  const units = computed<SpecializedUnitItem[]>(() => {
    return [...specializedUnitsData, ...customUnits.value];
  });

  const allUnionsList = computed<SpecializedUnionConfig[]>(() => {
    return Object.values(unions.value);
  });

  function getUnion(slug: string): SpecializedUnionConfig | undefined {
    return unions.value[slug];
  }

  function getUnitsForUnion(slug: string): SpecializedUnitItem[] {
    return units.value.filter((u) => u.unionId === slug);
  }

  // ایجاد و معرفی اتحادیه تخصصی جدید
  function createUnion(payload: CreateUnionPayload): string {
    const cleanSlug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || `union_${Date.now()}`;

    const newUnionConfig: SpecializedUnionConfig = {
      id: cleanSlug,
      name: payload.name.trim(),
      unionName: payload.unionName.trim(),
      slug: cleanSlug,
      description: payload.description.trim(),
      badgeText: payload.badgeText.trim() || payload.name.trim(),
      iconName: payload.iconName || 'Store',
      primaryColor: payload.primaryColor || '#0284c7',
      kpis: [
        {
          label: 'واحدهای فعال تحت پوشش',
          value: fa(payload.estimatedUnits || 350),
          tone: 'primary',
          hint: 'دارای پروانه صنفی معتبر',
        },
        {
          label: payload.metric1Name,
          value: '۸۸٪',
          tone: 'accent',
          hint: 'شاخص ارزیابی ماه جاری',
        },
        {
          label: 'هشدارهای نظارتی و تخلف',
          value: '۱۲',
          tone: 'warning',
          hint: 'در مهلت قانونی رفع نواقص',
        },
        {
          label: 'پایش‌های میدانی اهواز',
          value: '۱۴۰',
          tone: 'success',
          hint: 'بازرسی‌های دوره‌ای ماه جاری',
        },
      ],
      categories: [
        'همه رسته‌ها',
        ...(payload.categories.length > 0
          ? payload.categories
          : ['رسته اصلی', 'فروشگاه‌های ممتاز', 'خدمات و کارگاه‌ها']),
      ],
      statuses: [
        { value: 'normal', label: 'منطبق بر ضوابط و نرخ‌نامه' },
        { value: 'warning', label: 'نوسان قیمت / اخطار اولیه' },
        { value: 'alert', label: 'تخلف صنفی / پرونده تعزیراتی' },
      ],
      chartConfig: {
        title: `مقایسه شاخص‌های نظارتی ${payload.name.trim()} (اهواز)`,
        metric1Name: payload.metric1Name.trim(),
        metric2Name: payload.metric2Name.trim(),
        unit: payload.unit.trim() || 'واحد',
      },
    };

    // ذخیره در اتحادیه‌های سفارشی
    customUnions.value[cleanSlug] = newUnionConfig;
    localStorage.setItem('asnaf_custom_unions', JSON.stringify(customUnions.value));

    // تولید نمونه واحدهای اولیه در محلات پرتردد اهواز برای نقشه و آمار زنده
    const sampleNeighborhoods = [
      { name: 'کیانپارس', region: 'منطقه ۲', x: 42, y: 38 },
      { name: 'زیتون کارمندی', region: 'منطقه ۳', x: 55, y: 30 },
      { name: 'امانیه', region: 'منطقه ۱', x: 65, y: 52 },
      { name: 'گلستان', region: 'منطقه ۴', x: 38, y: 46 },
      { name: 'نادری', region: 'منطقه ۱', x: 25, y: 62 },
      { name: 'پادادشهر', region: 'منطقه ۸', x: 15, y: 30 },
    ];

    const generatedUnits: SpecializedUnitItem[] = sampleNeighborhoods.map((n, i) => {
      const isAlert = i === 1;
      const isWarn = i === 3;
      const category =
        payload.categories[i % Math.max(1, payload.categories.length)] || 'رسته اصلی';

      return {
        id: Date.now() + i,
        name: `${payload.name.replace('ماژول ', '')} نمونه ${n.name}`,
        operator: `متصدی ${n.name}`,
        mobile: `0916${1000000 + i * 111111}`,
        unionId: cleanSlug,
        unionName: payload.unionName.trim(),
        category,
        neighborhood: n.name,
        region: n.region,
        address: `${n.name}، خیابان اصلی، جنب بانک تجارت`,
        status: isAlert ? 'alert' : isWarn ? 'warning' : 'normal',
        statusLabel: isAlert
          ? 'تخلف صنفی / پرونده تعزیراتی'
          : isWarn
            ? 'نوسان قیمت / اخطار اولیه'
            : 'منطبق بر ضوابط و نرخ‌نامه',
        metric1Label: payload.metric1Name.trim(),
        metric1Value: Math.round(75 + i * 4),
        metric2Label: payload.metric2Name.trim(),
        metric2Value: Math.round(70 + i * 5),
        lastInspectionDate: '۱۴۰۵/۰۸/۰۴',
        inspectorName: 'رضا موسوی',
        notes: `پایش تخصصی ضوابط صنف ${payload.name} در منطقه ${n.region}.`,
        x: n.x,
        y: n.y,
      };
    });

    customUnits.value.push(...generatedUnits);
    localStorage.setItem('asnaf_custom_units', JSON.stringify(customUnits.value));

    return cleanSlug;
  }

  return {
    unions,
    units,
    allUnionsList,
    getUnion,
    getUnitsForUnion,
    createUnion,
  };
});
