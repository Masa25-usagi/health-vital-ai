#!/usr/bin/env node
import fs from "node:fs";
import { generateHealthAdvice } from "./advisor.ts";
import { parseAppleHealthRecord } from "./parsers/apple_health.ts";
import { parseFitbitRecord } from "./parsers/fitbit.ts";
import type { VitalRecord } from "./types.ts";

function printUsage() {
  console.log(`
health-ai - Smartwatch Vital Data Analyzer & Health Advisor

Usage:
  health-ai advise --sleep-hours <num> [--hrv <ms>] [--rhr <bpm>] [--fatigue low|medium|high|extreme]
  health-ai parse-apple <export.json>
  health-ai parse-fitbit <fitbit.json>
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const command = args[0];

  if (command === "advise") {
    let sleepHours = 7.0;
    let hrv: number | undefined;
    let rhr = 64;
    let fatigue: any = "medium";

    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--sleep-hours" && args[i + 1]) sleepHours = parseFloat(args[++i]);
      else if (args[i] === "--hrv" && args[i + 1]) hrv = parseFloat(args[++i]);
      else if (args[i] === "--rhr" && args[i + 1]) rhr = parseFloat(args[++i]);
      else if (args[i] === "--fatigue" && args[i + 1]) fatigue = args[++i];
    }

    const record: VitalRecord = {
      date: new Date().toISOString().split("T")[0],
      device: "manual",
      sleep: { totalMinutes: Math.round(sleepHours * 60) },
      heartRate: { restingBpm: rhr, baselineRestingBpm: 62, hrvRmssd: hrv, baselineHrv: 50 },
      subjectiveFatigue: fatigue
    };

    const advice = generateHealthAdvice(record);
    console.log(`=== 本日の体調判定 (${advice.date}) ===`);
    console.log(advice.headline);
    console.log(`回復スコア: ${advice.recoveryAssessment.score} / 100 (${advice.recoveryAssessment.statusText})\n`);
    console.log("【分析根拠】");
    for (const r of advice.rationale) console.log(`・${r}`);
    console.log("\n【本日の行動プラン】");
    console.log(`・通塾・登校判断: ${advice.actionPlan.attendance}`);
    console.log(`・学習方針: ${advice.actionPlan.studyApproach}`);
    console.log(`・今夜の睡眠: ${advice.actionPlan.sleepTonight}`);
    return;
  }

  if (command === "parse-apple") {
    const file = args[1];
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    const record = parseAppleHealthRecord(data);
    const advice = generateHealthAdvice(record);
    console.log(JSON.stringify(advice, null, 2));
    return;
  }

  if (command === "parse-fitbit") {
    const file = args[1];
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    const record = parseFitbitRecord(data);
    const advice = generateHealthAdvice(record);
    console.log(JSON.stringify(advice, null, 2));
    return;
  }

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
