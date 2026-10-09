import type { VitalRecord } from "../types.ts";

export function parseFitbitRecord(raw: Record<string, unknown>): VitalRecord {
  const dateStr = String(raw.dateOfSleep || raw.date || new Date().toISOString().split("T")[0]);
  const summary = (raw.summary as Record<string, unknown>) || raw;
  const stages = (summary.stages as Record<string, unknown>) || (raw.stages as Record<string, unknown>) || {};

  const totalMinutes = Number(summary.totalMinutesAsleep || raw.minutesAsleep || raw.durationMinutes || 0);
  const deepMinutes = stages.deep ? Number(stages.deep) : undefined;
  const remMinutes = stages.rem ? Number(stages.rem) : undefined;
  const lightMinutes = stages.light ? Number(stages.light) : undefined;

  const restingBpm = Number(raw.restingHeartRate || summary.restingHeartRate || 64);
  const hrv = raw.dailyHrv ? Number(raw.dailyHrv) : undefined;

  return {
    date: dateStr,
    device: "fitbit",
    sleep: {
      totalMinutes,
      deepMinutes,
      remMinutes,
      lightMinutes,
      efficiencyPercent: raw.efficiency ? Number(raw.efficiency) : undefined
    },
    heartRate: {
      restingBpm,
      baselineRestingBpm: raw.baselineRestingBpm ? Number(raw.baselineRestingBpm) : 62,
      hrvRmssd: hrv,
      baselineHrv: raw.baselineHrv ? Number(raw.baselineHrv) : 52
    },
    steps: raw.steps ? Number(raw.steps) : undefined,
    subjectiveFatigue: (raw.fatigue as any) || undefined
  };
}
