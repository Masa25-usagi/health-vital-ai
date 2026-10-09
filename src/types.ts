export type RecommendationLevel = "FULL_ATTEND" | "LIGHT_MODE" | "REST_REMOTE" | "CONSULT_DOCTOR";

export interface SleepMetrics {
  totalMinutes: number; // total sleep time
  deepMinutes?: number;
  remMinutes?: number;
  lightMinutes?: number;
  awakeMinutes?: number;
  efficiencyPercent?: number;
}

export interface HeartRateMetrics {
  restingBpm: number;
  baselineRestingBpm?: number;
  hrvRmssd?: number; // Heart Rate Variability (ms)
  baselineHrv?: number;
}

export interface VitalRecord {
  date: string; // YYYY-MM-DD
  device: "apple_watch" | "fitbit" | "manual";
  sleep: SleepMetrics;
  heartRate?: HeartRateMetrics;
  steps?: number;
  subjectiveFatigue?: "low" | "medium" | "high" | "extreme";
  notes?: string;
}

export interface RecoveryAssessment {
  score: number; // 0 to 100
  sleepScore: number; // 0 to 100
  cardioScore: number; // 0 to 100
  sleepDebtMinutes: number;
  statusText: string;
}

export interface AttendanceRecommendation {
  date: string;
  level: RecommendationLevel;
  headline: string;
  recoveryAssessment: RecoveryAssessment;
  rationale: string[];
  actionPlan: {
    attendance: string; // cram school / class advice
    studyApproach: string; // how to tackle work today
    sleepTonight: string; // bedtime guidance
  };
  hermesCheckInPrompt: string;
}
