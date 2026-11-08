export type BuiltInUnionId =
  | 'supermarket'
  | 'protein'
  | 'restaurant'
  | 'automotive';

export type SpecializedUnionId = BuiltInUnionId | (string & {});

export type SpecializedUnitStatus = 'normal' | 'warning' | 'alert';

export interface SpecializedKpiConfig {
  readonly label: string;
  readonly value: number | string;
  readonly tone?: 'primary' | 'success' | 'warning' | 'destructive' | 'accent';
  readonly hint?: string;
}

export interface CreateUnionPayload {
  readonly name: string;
  readonly unionName: string;
  readonly slug: string;
  readonly description: string;
  readonly badgeText: string;
  readonly iconName: string;
  readonly primaryColor: string;
  readonly categories: string[];
  readonly metric1Name: string;
  readonly metric2Name: string;
  readonly unit: string;
  readonly estimatedUnits: number;
}

export interface SpecializedUnionConfig {
  readonly id: SpecializedUnionId;
  readonly name: string;
  readonly unionName: string;
  readonly slug: string;
  readonly description: string;
  readonly badgeText: string;
  readonly iconName: string;
  readonly primaryColor: string;
  readonly kpis: readonly [
    SpecializedKpiConfig,
    SpecializedKpiConfig,
    SpecializedKpiConfig,
    SpecializedKpiConfig,
  ];
  readonly categories: readonly string[];
  readonly statuses: readonly {
    readonly value: SpecializedUnitStatus;
    readonly label: string;
  }[];
  readonly chartConfig: {
    readonly title: string;
    readonly metric1Name: string;
    readonly metric2Name: string;
    readonly unit: string;
  };
}

export interface SpecializedUnitItem {
  readonly id: number;
  readonly name: string;
  readonly operator: string;
  readonly mobile?: string;
  readonly unionId: SpecializedUnionId;
  readonly unionName: string;
  readonly category: string;
  readonly neighborhood: string;
  readonly region: string;
  readonly address: string;
  readonly status: SpecializedUnitStatus;
  readonly statusLabel: string;
  readonly metric1Label: string;
  readonly metric1Value: number;
  readonly metric2Label: string;
  readonly metric2Value: number;
  readonly lastInspectionDate: string;
  readonly inspectorName?: string;
  readonly notes?: string;
  readonly x?: number;
  readonly y?: number;
}
