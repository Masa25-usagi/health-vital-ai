import test from "node:test";
import assert from "node:assert/strict";
import { generateHealthAdvice } from "../src/advisor.ts";
import type { VitalRecord } from "../src/types.ts";

test("generateHealthAdvice recommends REST_REMOTE when sleep debt is high", () => {
  const exhaustedRecord: VitalRecord = {
    date: "2026-10-04",
    device: "apple_watch",
    sleep: {
      totalMinutes: 300, // 5 hrs (3 hrs debt)
      deepMinutes: 25
    },
    heartRate: {
      restingBpm: 68,
      baselineRestingBpm: 62,
      hrvRmssd: 36,
      baselineHrv: 50
    },
    subjectiveFatigue: "high"
  };

  const advice = generateHealthAdvice(exhaustedRecord);
  assert.equal(advice.level, "REST_REMOTE");
  assert.equal(advice.actionPlan.attendance.includes("オンライン") || advice.actionPlan.attendance.includes("休養"), true);
  assert.equal(advice.hermesCheckInPrompt.includes("Health Companion"), true);
});

test("generateHealthAdvice recommends FULL_ATTEND when rested", () => {
  const restedRecord: VitalRecord = {
    date: "2026-10-04",
    device: "manual",
    sleep: {
      totalMinutes: 490,
      deepMinutes: 90
    },
    heartRate: {
      restingBpm: 60,
      baselineRestingBpm: 62
    },
    subjectiveFatigue: "low"
  };

  const advice = generateHealthAdvice(restedRecord);
  assert.equal(advice.level, "FULL_ATTEND");
  assert.equal(advice.actionPlan.attendance.includes("予定通り"), true);
});
