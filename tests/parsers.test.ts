import test from "node:test";
import assert from "node:assert/strict";
import { parseAppleHealthRecord } from "../src/parsers/apple_health.ts";
import { parseFitbitRecord } from "../src/parsers/fitbit.ts";

test("parseAppleHealthRecord maps fields properly", () => {
  const raw = {
    date: "2026-10-04",
    asleepMinutes: 420,
    deepSleepMinutes: 70,
    remSleepMinutes: 80,
    restingHeartRate: 61,
    hrv: 52,
    steps: 7800,
    fatigue: "low"
  };
  const record = parseAppleHealthRecord(raw);
  assert.equal(record.device, "apple_watch");
  assert.equal(record.sleep.totalMinutes, 420);
  assert.equal(record.sleep.deepMinutes, 70);
  assert.equal(record.heartRate?.restingBpm, 61);
  assert.equal(record.heartRate?.hrvRmssd, 52);
  assert.equal(record.steps, 7800);
});

test("parseFitbitRecord maps nested stages properly", () => {
  const raw = {
    dateOfSleep: "2026-10-04",
    summary: {
      totalMinutesAsleep: 390,
      restingHeartRate: 65,
      stages: {
        deep: 55,
        rem: 75,
        light: 220
      }
    },
    dailyHrv: 44
  };
  const record = parseFitbitRecord(raw);
  assert.equal(record.device, "fitbit");
  assert.equal(record.sleep.totalMinutes, 390);
  assert.equal(record.sleep.deepMinutes, 55);
  assert.equal(record.heartRate?.restingBpm, 65);
  assert.equal(record.heartRate?.hrvRmssd, 44);
});
