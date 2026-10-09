import type { VitalRecord, RecoveryAssessment } from "./types.ts";

export function safeDiv(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  return numerator / denominator;
}

export function evaluateRecovery(record: VitalRecord, targetSleepMinutes = 480): RecoveryAssessment {
  const safeTarget = Number.isFinite(targetSleepMinutes) && targetSleepMinutes > 0 ? targetSleepMinutes : 480;
  const rawSleep = record.sleep || { totalMinutes: 0 };
  const rawTotalMinutes = Number.isFinite(rawSleep.totalMinutes) ? rawSleep.totalMinutes : 0;
  // Clamp total sleep minutes between 0 and 1440 (24h)
  const totalMinutes = Math.max(0, Math.min(1440, rawTotalMinutes));
  const sleepDebtMinutes = Math.max(0, safeTarget - totalMinutes);

  // 1. Calculate Sleep Score (0-100)
  let sleepRatio = safeDiv(totalMinutes, safeTarget, 0);
  if (sleepRatio > 1.1) sleepRatio = 1.0; // oversleeping beyond 110% capped
  let sleepScore = Math.min(100, Math.round(sleepRatio * 85));

  // Deep sleep bonus (ideal: >= 15% of total sleep)
  const rawDeepMinutes = Number.isFinite(rawSleep.deepMinutes) ? rawSleep.deepMinutes! : 0;
  const deepMinutes = Math.max(0, Math.min(totalMinutes, rawDeepMinutes));
  if (deepMinutes > 0 && totalMinutes > 0) {
    const deepRatio = safeDiv(deepMinutes, totalMinutes, 0);
    if (deepRatio >= 0.15) {
      sleepScore += 10;
    } else if (deepRatio >= 0.10) {
      sleepScore += 5;
    }
  }

  // Sleep efficiency modifier (0..100)
  if (rawSleep.efficiencyPercent !== undefined && Number.isFinite(rawSleep.efficiencyPercent)) {
    const eff = Math.max(0, Math.min(100, rawSleep.efficiencyPercent));
    if (eff >= 90) sleepScore += 5;
    else if (eff < 80) sleepScore -= 10;
  }
  sleepScore = Math.max(10, Math.min(100, sleepScore));

  // 2. Calculate Cardio Score (0-100)
  let cardioScore = 75; // neutral baseline
  if (record.heartRate) {
    const hr = record.heartRate;
    const rawRhr = Number.isFinite(hr.restingBpm) ? hr.restingBpm : 62;
    // Sensor validity guard: physiological human range 25..250 bpm
    const isValidRhr = rawRhr >= 25 && rawRhr <= 250;
    const restingBpm = isValidRhr ? rawRhr : 62;

    const rawBaseline = Number.isFinite(hr.baselineRestingBpm) && hr.baselineRestingBpm! >= 25 && hr.baselineRestingBpm! <= 250
      ? hr.baselineRestingBpm!
      : 62;
    const rhrDiff = restingBpm - rawBaseline;

    // Resting HR: Elevated HR is a strong sign of acute fatigue / illness
    if (rhrDiff <= -2) cardioScore += 10; // well rested
    else if (rhrDiff >= 8) cardioScore -= 30; // heavy stress / fever / fatigue
    else if (rhrDiff >= 4) cardioScore -= 15; // moderate fatigue

    // HRV modifier: higher than baseline = good recovery, lower = stress
    if (
      hr.hrvRmssd !== undefined && Number.isFinite(hr.hrvRmssd) && hr.hrvRmssd > 0 &&
      hr.baselineHrv !== undefined && Number.isFinite(hr.baselineHrv) && hr.baselineHrv > 0
    ) {
      const hrvRatio = safeDiv(hr.hrvRmssd, hr.baselineHrv, 1.0);
      if (hrvRatio >= 1.15) cardioScore += 15;
      else if (hrvRatio <= 0.8) cardioScore -= 20;
    }
  }
  cardioScore = Math.max(10, Math.min(100, cardioScore));

  // Overall Score (60% sleep, 40% cardio)
  let overallScore = Math.round(sleepScore * 0.6 + cardioScore * 0.4);

  // Subjective fatigue modifier if provided
  if (record.subjectiveFatigue === "extreme") overallScore -= 20;
  else if (record.subjectiveFatigue === "high") overallScore -= 10;
  else if (record.subjectiveFatigue === "low") overallScore += 5;

  overallScore = Math.max(5, Math.min(100, overallScore));

  let statusText = "良好（フル活動可能）";
  if (overallScore < 40) statusText = "要休養（深刻な疲労・休養推奨）";
  else if (overallScore < 60) statusText = "注意（疲労蓄積・省エネモード推奨）";
  else if (overallScore < 80) statusText = "普通（標準的な活動可能）";

  return {
    score: overallScore,
    sleepScore,
    cardioScore,
    sleepDebtMinutes,
    statusText
  };
}
