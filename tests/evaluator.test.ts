import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRecovery } from "../src/evaluator.ts";
import { generateHealthAdvice } from "../src/advisor.ts";
import type { VitalRecord } from "../src/types.ts";

test("evaluateRecovery gives high score for optimal sleep and resting HR", () => {
  const goodRecord: VitalRecord = {
    date: "2026-10-04",
    device: "apple_watch",
    sleep: {
      totalMinutes: 480, // 8 hrs
      deepMinutes: 90,   // ~18%
      remMinutes: 110,
      efficiencyPercent: 92
    },
    heartRate: {
      restingBpm: 60,
      baselineRestingBpm: 62,
      hrvRmssd: 58,
      baselineHrv: 50
    },
    subjectiveFatigue: "low"
  };

  const res = evaluateRecovery(goodRecord);
  assert.equal(res.score >= 80, true);
  assert.equal(res.sleepDebtMinutes, 0);
  assert.equal(res.statusText.includes("良好"), true);
});

test("evaluateRecovery gives low score for severe sleep deprivation and elevated HR", () => {
  const badRecord: VitalRecord = {
    date: "2026-10-04",
    device: "apple_watch",
    sleep: {
      totalMinutes: 240, // 4 hrs
      deepMinutes: 20
    },
    heartRate: {
      restingBpm: 74, // +12 bpm vs baseline
      baselineRestingBpm: 62,
      hrvRmssd: 30,
      baselineHrv: 50
    },
    subjectiveFatigue: "extreme"
  };

  const res = evaluateRecovery(badRecord);
  assert.equal(res.score < 40, true);
  assert.equal(res.sleepDebtMinutes, 240);
  assert.equal(res.statusText.includes("休養"), true);
});

test("evaluateRecovery safely handles zero sleep, sensor outliers and null baselines", () => {
  const zeroRecord: VitalRecord = {
    date: "2026-10-04",
    device: "apple_watch",
    sleep: {
      totalMinutes: 0,
      deepMinutes: 0
    },
    heartRate: {
      restingBpm: 600, // Sensor glitch / artifact
      baselineRestingBpm: 0,
      hrvRmssd: 0,
      baselineHrv: 0
    }
  };

  const res = evaluateRecovery(zeroRecord, 0); // targetSleepMinutes=0 edge case
  assert.equal(Number.isFinite(res.score), true);
  assert.equal(Number.isFinite(res.sleepScore), true);
  assert.equal(Number.isFinite(res.cardioScore), true);
  assert.equal(res.score >= 5 && res.score <= 100, true);
  assert.equal(res.sleepDebtMinutes >= 0, true);

  // Test advisor does not trigger false CONSULT_DOCTOR on 600 bpm sensor glitch
  const glitchGoodSleepRecord: VitalRecord = {
    date: "2026-10-04",
    device: "apple_watch",
    sleep: { totalMinutes: 480 },
    heartRate: {
      restingBpm: 600, // Sensor glitch
      baselineRestingBpm: 62
    }
  };
  const advice = generateHealthAdvice(glitchGoodSleepRecord);
  assert.notEqual(advice.level, "CONSULT_DOCTOR", "Sensor glitch (600 bpm) must not trigger false emergency CONSULT_DOCTOR");
  assert.equal(advice.rationale.some(r => r.includes("センサー測定値異常")), true);
});

