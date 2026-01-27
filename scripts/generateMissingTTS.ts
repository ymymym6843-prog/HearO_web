/**
 * 신규 6개 운동 TTS 생성 스크립트
 *
 * Gemini TTS Edge Function을 사용하여 WAV 파일 생성
 *
 * 누락된 운동:
 * - arm_raise_front (팔 앞으로 들기)
 * - shoulder_abduction (어깨 벌리기)
 * - elbow_flexion (팔꿈치 굽히기)
 * - wall_push (벽 밀기)
 * - pinch_hold (집게 집기 유지)
 * - finger_tap_sequence (손가락 순차 터치)
 *
 * 사용법:
 * npx ts-node scripts/generateMissingTTS.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// 환경 변수
const SUPABASE_URL = 'https://wffdfuraqebmsoofyoon.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmZmRmdXJhcWVibXNvb2Z5b29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzEwNjQsImV4cCI6MjA4MTc0NzA2NH0.PTRPvKeU_bV1M2z3bY63HiReZQ5vvoOusq-QssBSAeM';

// 타입
type WorldviewType = 'fantasy' | 'sports' | 'idol' | 'sf' | 'zombie' | 'spy';
type GradeType = 'perfect' | 'good' | 'normal';

const MISSING_EXERCISES = [
  'arm_raise_front',
  'shoulder_abduction',
  'elbow_flexion',
  'wall_push',
  'pinch_hold',
  'finger_tap_sequence'
] as const;

// 세계관별 Gemini TTS 음성 설정
const WORLDVIEW_VOICES: Record<WorldviewType, string> = {
  fantasy: 'Zubenelgenubi',  // 현자 엘더린 (웅장한 남성)
  sports: 'Algieba',         // 코치 박 (활기찬 남성)
  idol: 'Achernar',          // 매니저 수진 (밝은 여성)
  sf: 'Autonoe',             // AI 아리아 (차분한 여성)
  zombie: 'Enceladus',       // 닥터 리 (긴장감 있는 남성)
  spy: 'Charon',             // 핸들러 오메가 (낮은 남성)
};

// 등급별 음성 스타일 (Gemini TTS voiceStyle)
const GRADE_STYLES: Record<GradeType, string> = {
  perfect: 'dramatic',    // 극적인 칭찬
  good: 'expressive',     // 표현적인 격려
  normal: 'gentle',       // 부드러운 응원
};

// 딜레이 함수
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Gemini TTS Edge Function 호출
async function generateTTS(
  text: string,
  worldviewId: WorldviewType,
  grade: GradeType
): Promise<Buffer | null> {
  const voiceName = WORLDVIEW_VOICES[worldviewId];
  const voiceStyle = GRADE_STYLES[grade];

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-tts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voiceName,
        voiceStyle,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`TTS API Error: ${response.status} - ${error}`);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.audioContent) {
      console.error('TTS generation failed:', data.error);
      return null;
    }

    // Base64 → Buffer
    return Buffer.from(data.audioContent, 'base64');
  } catch (error) {
    console.error('TTS request error:', error);
    return null;
  }
}

// 메인 실행
async function main() {
  const worldviews: WorldviewType[] = ['fantasy', 'sports', 'idol', 'sf', 'zombie', 'spy'];
  const grades: GradeType[] = ['perfect', 'good', 'normal'];

  const baseDir = 'C:/Users/dbals/VibeCoding/HearO_web/public/assets/prerendered';
  const storiesDir = path.join(baseDir, 'stories');
  const ttsDir = path.join(baseDir, 'tts');

  let totalGenerated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  console.log('========================================');
  console.log('TTS Generation Script (Gemini TTS)');
  console.log(`Target: ${MISSING_EXERCISES.length} exercises × ${worldviews.length} worldviews × ${grades.length} grades = ${MISSING_EXERCISES.length * worldviews.length * grades.length} files`);
  console.log('========================================\n');

  for (const exercise of MISSING_EXERCISES) {
    console.log(`\n▶ Processing: ${exercise}`);

    for (const worldview of worldviews) {
      for (const grade of grades) {
        const storyFile = path.join(storiesDir, worldview, `${exercise}_${grade}.txt`);
        const ttsFile = path.join(ttsDir, worldview, `${exercise}_${grade}.wav`);

        // TTS 파일이 이미 있으면 스킵
        if (fs.existsSync(ttsFile)) {
          console.log(`  ✓ Skip (exists): ${worldview}/${exercise}_${grade}.wav`);
          totalSkipped++;
          continue;
        }

        // 스토리 파일 읽기
        if (!fs.existsSync(storyFile)) {
          console.error(`  ✗ Story not found: ${storyFile}`);
          totalFailed++;
          continue;
        }

        const text = fs.readFileSync(storyFile, 'utf-8').trim();

        console.log(`  → Generating: ${worldview}/${exercise}_${grade}.wav`);

        // TTS 생성
        const audioBuffer = await generateTTS(text, worldview, grade);

        if (audioBuffer) {
          // 디렉토리 확인
          const dir = path.dirname(ttsFile);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // 파일 저장
          fs.writeFileSync(ttsFile, audioBuffer);
          console.log(`  ✓ Created: ${worldview}/${exercise}_${grade}.wav (${audioBuffer.length} bytes)`);
          totalGenerated++;
        } else {
          console.error(`  ✗ Failed: ${worldview}/${exercise}_${grade}.wav`);
          totalFailed++;
        }

        // API 레이트 리밋 방지 (1초 딜레이)
        await delay(1000);
      }
    }
  }

  console.log('\n========================================');
  console.log('TTS Generation Complete!');
  console.log(`  Generated: ${totalGenerated}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log('========================================');
}

// 실행
main().catch(console.error);
