# HearO Web - 프리렌더링 파일 체크리스트

## 개요
- 총 운동 수: 22개 (하체 6, 상체 4, 코어 4, 손 8)
- 세계관: 6개 (fantasy, sports, idol, sf, zombie, spy)
- 등급: 3개 (perfect, good, normal)
- TTS 파일 총 필요 수: 22 × 6 × 3 = **396개**

---

## 1. TTS 오디오 파일 현황

### ✅ 복사 완료 (HearO-v2에서 가져온 파일)
16개 운동 × 6개 세계관 × 3등급 = **288개 파일**

| 카테고리 | 운동 ID | 한글명 | 상태 |
|---------|--------|-------|------|
| 하체 | squat | 스쿼트 | ✅ 완료 |
| 하체 | wall_squat | 벽 스쿼트 | ✅ 완료 |
| 하체 | chair_stand | 의자 기립 | ✅ 완료 |
| 하체 | straight_leg_raise | 다리 들기 | ✅ 완료 |
| 하체 | standing_march_slow | 제자리 행진 | ✅ 완료 |
| 하체 | seated_knee_lift | 무릎 들기 | ✅ 완료 |
| 코어 | seated_core_hold | 코어 버티기 | ✅ 완료 |
| 코어 | standing_anti_extension_hold | 허리 버티기 | ✅ 완료 |
| 코어 | standing_arm_raise_core | 코어 팔 들기 | ✅ 완료 |
| 코어 | bridge | 브릿지 | ✅ 완료 |
| 손 | finger_flexion | 손가락 굽히기 | ✅ 완료 |
| 손 | finger_spread | 손가락 벌리기 | ✅ 완료 |
| 손 | wrist_flexion | 손목 굽히기 | ✅ 완료 |
| 손 | tendon_glide | 힘줄 글라이딩 | ✅ 완료 |
| 손 | thumb_opposition | 엄지 터치 | ✅ 완료 |
| 손 | grip_squeeze | 주먹 쥐기 | ✅ 완료 |

### ❌ 생성 필요 (HearO_web 신규 운동)
6개 운동 × 6개 세계관 × 3등급 = **108개 파일 필요**

| 카테고리 | 운동 ID | 한글명 | 우선순위 |
|---------|--------|-------|---------|
| 상체 | standing_arm_raise_front | 팔 앞으로 들기 | 🔴 높음 |
| 상체 | shoulder_abduction | 어깨 벌리기 | 🔴 높음 |
| 상체 | elbow_flexion | 팔꿈치 굽히기 | 🔴 높음 |
| 상체 | wall_push | 벽 밀기 | 🔴 높음 |
| 손 | pinch_hold | 집게 집기 | 🟡 중간 |
| 손 | finger_tap_sequence | 손가락 순서 터치 | 🟡 중간 |

---

## 2. 스토리 텍스트 파일 현황

### 파일 위치
`public/assets/prerendered/stories/all_stories.json`

### 현황
- ✅ 기존 16개 운동 스토리 복사 완료
- ❌ 신규 6개 운동 스토리 추가 필요

### 스토리 추가 필요 목록
각 운동별로 6개 세계관 × 3등급 = 18개 스토리 필요
총 6개 운동 × 18개 = **108개 스토리 텍스트 추가 필요**

---

## 3. NPC 이미지 파일 현황

### 파일 구조
```
public/assets/prerendered/npc/
├── fantasy/
│   ├── elderlin/     (현자 엘더린)
│   ├── serena/
│   ├── kairon/
│   ├── lunaria/
│   └── narrator/
├── sports/
│   ├── coach_park/   (코치 박)
│   ├── jiyeon/
│   ├── rival_kim/
│   ├── physio_lee/
│   └── narrator/
├── idol/
│   ├── manager_sujin/ (매니저 수진)
│   ├── haru/
│   ├── producer_jang/
│   ├── vocal_trainer/
│   └── narrator/
├── sf/
│   ├── aria/          (AI 아리아)
│   └── ... (추가 필요)
├── zombie/
│   ├── dr_lee/        (닥터 리)
│   └── ... (추가 필요)
└── spy/
    ├── handler_omega/ (핸들러 오메가)
    └── ... (추가 필요)
```

### 현황
- ✅ fantasy, sports, idol NPC 이미지 완료
- ⚠️ sf, zombie, spy NPC 이미지 확인 필요

---

## 4. TTS 생성 스크립트 설정

### Gemini TTS 음성 설정 (HearO-v2와 동일)

**중요**: HearO-v2는 Gemini 2.5 Flash TTS를 사용합니다. 기존 파일과 일관성을 위해 반드시 동일한 설정을 사용해야 합니다.

| 세계관 | Gemini 음성 | 캐릭터 | 기본 속도 |
|-------|------------|-------|----------|
| fantasy | Zubenelgenubi | 현자 엘더린 | 0.85 |
| sports | Algieba | 코치 박 | 1.05 |
| idol | Achernar | 매니저 수진 | 1.0 |
| sf | Autonoe | AI 아리아 | 1.05 |
| zombie | Enceladus | 닥터 리 | 1.08 |
| spy | Charon | 핸들러 오메가 | 0.88 |

### 등급별 스타일 설정

| 등급 | 스타일 접두사 |
|-----|-------------|
| perfect | `[Dramatic, theatrical delivery]` |
| good | `[Soft, gentle voice]` 또는 `[Expressive, emotive tone]` |
| normal | `[Expressive, emotive tone]` 또는 `[Energetic, upbeat tone]` |

### Gemini TTS API 설정
- **Primary 모델**: `gemini-2.5-flash-preview-tts` (빠르고 저렴)
- **Fallback 모델**: `gemini-2.5-pro-preview-tts` (Rate limit 시)
- **기본 음성**: `Kore` (한국어 최적화) - 세계관별로 다른 음성 사용
- **출력 형식**: PCM → WAV (24000Hz, 16bit, mono)

---

## 5. 생성 우선순위

### Phase 1: 상체 운동 TTS + 스토리 (MVP 필수)
1. standing_arm_raise_front (팔 앞으로 들기)
2. shoulder_abduction (어깨 벌리기)
3. elbow_flexion (팔꿈치 굽히기)
4. wall_push (벽 밀기)

**예상 파일 수**: 4 × 6 × 3 = 72개 TTS + 72개 스토리

### Phase 2: 손 재활 추가 운동 TTS + 스토리
1. pinch_hold (집게 집기)
2. finger_tap_sequence (손가락 순서 터치)

**예상 파일 수**: 2 × 6 × 3 = 36개 TTS + 36개 스토리

---

## 6. 파일 네이밍 규칙

### TTS 파일
```
/assets/prerendered/tts/{worldview}/{exercise}_{grade}.wav

예시:
/assets/prerendered/tts/fantasy/standing_arm_raise_front_perfect.wav
/assets/prerendered/tts/sports/shoulder_abduction_good.wav
```

### 스토리 JSON 구조
```json
{
  "fantasy": {
    "standing_arm_raise_front": {
      "perfect": "위대한 용사여, ...",
      "good": "잘했어요, ...",
      "normal": "좋은 시작이에요, ..."
    }
  }
}
```

---

## 7. 생성 도구

### TTS 생성 (Gemini TTS 필수)
**중요**: HearO-v2에서 복사한 기존 TTS 파일은 Gemini TTS로 생성되었습니다.
신규 파일도 반드시 Gemini TTS를 사용해야 음성 일관성이 유지됩니다.

1. **Gemini 2.5 Flash TTS** (필수)
   - HearO-v2 스크립트 사용: `scripts/generate_tts_gemini.py`
   - 감정 표현 향상 (expressive, dramatic, gentle, energetic)
   - 세계관별 캐릭터 음성 일관성

2. **API 호출 방식**
   ```python
   # 환경변수 설정
   export GEMINI_API_KEY=your_api_key

   # 전체 생성
   python generate_tts_gemini.py

   # 특정 세계관만
   python generate_tts_gemini.py --worldview fantasy

   # 실패한 항목 재시도
   python generate_tts_gemini.py --retry-failed
   ```

### 스토리 생성 (Gemini API)
1. **Gemini 3 Pro** (권장)
   - Edge Function: `generate-story`
   - 폴백: Gemini 2.5 Pro
   - 세계관별 시스템 프롬프트 사용

2. **수동 작성**
   - 기존 스토리 스타일 참고
   - `all_stories.json` 형식 준수

---

## 8. 진행 체크리스트

- [x] HearO-v2에서 기존 파일 복사
- [x] prerenderedContentService.ts 생성
- [x] storyAgents.ts 설정 파일 생성
- [x] aiGateway.ts 서비스 생성
- [ ] 신규 운동 스토리 텍스트 작성
- [ ] 신규 운동 TTS 생성
- [ ] all_stories.json에 신규 스토리 추가
- [ ] NPC 이미지 보완 (sf, zombie, spy)

---

## 업데이트 기록
- 2025-01-23: 초기 문서 생성, HearO-v2 파일 복사 완료
- 2025-01-23: TTS 설정 수정 - Azure → Gemini TTS (HearO-v2와 동일하게)
