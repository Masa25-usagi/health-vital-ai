import type { VitalRecord } from "../types.ts";

export function parseAppleHealthRecord(raw: Record<string, unknown>): VitalRecord {
  const dateStr = String(raw.date || new Date().toISOString().split("T")[0]);
  const asleepMinutes = Number(raw.asleepMinutes || raw.totalSleepMinutes || raw.sleepMinutes || 0);
  const deepMinutes = raw.deepSleepMinutes ? Number(raw.deepSleepMinutes) : undefined;
  const remMinutes = raw.remSleepMinutes ? Number(raw.remSleepMinutes) : undefined;
  const lightMinutes = raw.lightSleepMinutes ? Number(raw.lightSleepMinutes) : undefined;
  const efficiency = raw.sleepEfficiency ? Number(raw.sleepEfficiency) : undefined;

  const restingBpm = raw.restingHeartRate ? Number(raw.restingHeartRate) : 65;
  const hrv = raw.hrv || raw.hrvRmssd ? Number(raw.hrv || raw.hrvRmssd) : undefined;

  return {
    date: dateStr,
    device: "apple_watch",
    sleep: {
      totalMinutes: asleepMinutes,
      deepMinutes,
      remMinutes,
      lightMinutes,
      efficiencyPercent: efficiency
    },
    heartRate: {
      restingBpm,
      baselineRestingBpm: raw.baselineRestingBpm ? Number(raw.baselineRestingBpm) : 62,
      hrvRmssd: hrv,
      baselineHrv: raw.baselineHrv ? Number(raw.baselineHrv) : 50
    },
    steps: raw.steps ? Number(raw.steps) : undefined,
    subjectiveFatigue: (raw.fatigue as any) || undefined
  };
}
