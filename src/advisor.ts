import type { VitalRecord, AttendanceRecommendation, RecommendationLevel } from "./types.ts";
import { evaluateRecovery } from "./evaluator.ts";

export function generateHealthAdvice(record: VitalRecord): AttendanceRecommendation {
  const assessment = evaluateRecovery(record);
  const score = assessment.score;
  const debtHours = (assessment.sleepDebtMinutes / 60).toFixed(1);

  let level: RecommendationLevel = "FULL_ATTEND";
  let headline = "";
  const rationale: string[] = [];

  const rawSleepMin = record.sleep && Number.isFinite(record.sleep.totalMinutes) ? record.sleep.totalMinutes : 0;
  const totalSleepMin = Math.max(0, Math.min(1440, rawSleepMin));
  const sleepHours = (totalSleepMin / 60).toFixed(1);
  rationale.push(`睡眠時間: ${sleepHours} 時間 (睡眠負債: 約 ${debtHours} 時間)`);

  let effectiveHrDiff = 0;
  let hasValidHr = false;
  if (record.heartRate) {
    const hr = record.heartRate;
    const rawRhr = Number.isFinite(hr.restingBpm) ? hr.restingBpm : 62;
    const isValidRhr = rawRhr >= 25 && rawRhr <= 250;
    const restingBpm = isValidRhr ? rawRhr : 62;
    const rawBaseline = Number.isFinite(hr.baselineRestingBpm) && hr.baselineRestingBpm! >= 25 && hr.baselineRestingBpm! <= 250
      ? hr.baselineRestingBpm!
      : 62;
    effectiveHrDiff = restingBpm - rawBaseline;
    hasValidHr = isValidRhr;

    if (isValidRhr) {
      const sign = effectiveHrDiff >= 0 ? `+${effectiveHrDiff}` : `${effectiveHrDiff}`;
      rationale.push(`安静時心拍数: ${restingBpm} bpm (平常時比: ${sign} bpm)`);
    } else {
      rationale.push(`安静時心拍数: センサー測定値異常(${rawRhr} bpm)のため基準値で代替`);
    }
    if (hr.hrvRmssd && Number.isFinite(hr.hrvRmssd) && hr.hrvRmssd > 0) {
      rationale.push(`心拍変動 (HRV): ${hr.hrvRmssd} ms`);
    }
  }

  if (record.subjectiveFatigue) {
    rationale.push(`本人の自覚疲労感: ${record.subjectiveFatigue}`);
  }

  let actionPlan: AttendanceRecommendation["actionPlan"];

  if (score < 30 || (hasValidHr && effectiveHrDiff >= 12)) {
    level = "CONSULT_DOCTOR";
    headline = "⚠️ 著しい自律神経・身体疲労または体調急変の兆候";
    actionPlan = {
      attendance: "通塾・外出は中止し、終日自宅で完全休養してください。体温測定を行い、発熱や強い倦怠感がある場合は医療機関の受診を推奨します。",
      studyApproach: "本日の新規学習・長時間の画面作業は全て延期。脳を休めることを最優先にしてください。",
      sleepTonight: "21時〜22時までに消灯し、9時間以上の十分な睡眠を確保してください。"
    };
  } else if (score < 50) {
    level = "REST_REMOTE";
    headline = "💤 睡眠負債と疲労が蓄積：自宅休養またはオンライン受講を推奨";
    actionPlan = {
      attendance: "無理な通塾・外出は避け、可能であればオンライン受講または振替を推奨します。0か100かで悩むよりも、今日は体調回復を最優先する合理的な判断です。",
      studyApproach: "宿題や新規単元の暗記は無理に行わず、すでに解いた問題の軽い見直し（30〜45分程度）に留めてください。",
      sleepTonight: "スマホやPCは就寝1時間前にオフにし、22時までに就寝してください。"
    };
  } else if (score < 75) {
    level = "LIGHT_MODE";
    headline = "🟡 やや疲労傾向：通常出席可能ですが省エネモードで活動推奨";
    actionPlan = {
      attendance: "通塾・授業は出席可能ですが、移動時の防寒や休憩を意識してください。放課後の寄り道や長居は控えましょう。",
      studyApproach: "授業中は要点のみ集中してノートを取り、自習室での長時間の居残りは避けて早めに帰宅してください。",
      sleepTonight: "いつもより30分〜1時間早く就寝し、睡眠負債を解消しましょう。"
    };
  } else {
    level = "FULL_ATTEND";
    headline = "🟢 回復状態は良好：通常の通塾・学習活動に万全です";
    actionPlan = {
      attendance: "予定通り通塾・登校して問題ありません。集中力・学習効率が良好な状態です。",
      studyApproach: "苦手単元の演習や創造的な課題、AIプログラミングなど負荷の高い作業に適しています。",
      sleepTonight: "現在の良好な生活リズムを維持し、決まった時間に就寝してください。"
    };
  }

  // Hermes check-in conversational prompt
  const hermesCheckInPrompt = `
【Hermes / Codex Health Companion Check-In】
ユーザーの今朝のヘルスケアデータ分析結果:
・回復スコア: ${score} / 100 (${assessment.statusText})
・判定: ${headline}
・推奨アクション: ${actionPlan.attendance}
・アドバイス方針: 責めるような言葉遣いを避け、「体調の客観的サイン（睡眠${sleepHours}時間、心拍推移）」を理由にして、無理せず健康第一で判断できるよう優しく後押ししてください。
`.trim();

  return {
    date: record.date,
    level,
    headline,
    recoveryAssessment: assessment,
    rationale,
    actionPlan,
    hermesCheckInPrompt
  };
}
