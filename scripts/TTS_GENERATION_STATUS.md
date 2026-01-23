# HearO Web MVP TTS 생성 현황

> 최종 업데이트: 2025-01-18

## 개요

MVP 운동 6개에 대한 TTS 음성 파일 생성 상태입니다.

- **TTS 엔진**: Gemini 2.5 Flash / Pro (폴백)
- **형식**: WAV (24kHz, 16bit, mono)
- **세계관**: 6개 (fantasy, sports, idol, sf, zombie, spy)
- **등급**: 3개 (perfect, good, normal)

---

## TTS 파일 현황

### 기존 TTS (재사용) - 54개

| 운동 | 상태 | 파일 수 | 비고 |
|------|------|---------|------|
| squat | ✅ 완료 | 18개 | 6세계관 × 3등급 |
| high_knees | ✅ 완료 | 18개 | 6세계관 × 3등급 |
| plank_hold | ✅ 완료 | 18개 | 6세계관 × 3등급 |

### 신규 TTS (생성 필요) - 54개

| 운동 | 상태 | 필요 파일 | 진행률 |
|------|------|-----------|--------|
| lunge | ⏳ 대기 | 18개 | 0% |
| bicep_curl | ⏳ 대기 | 18개 | 0% |
| arm_raise | ⏳ 대기 | 18개 | 0% |

### 백업된 TTS (더 이상 사용 안함) - 90개

위치: `public/assets/prerendered/tts_backup/`

| 운동 | 파일 수 |
|------|---------|
| bridge | 18개 |
| dead_bug | 18개 |
| bird_dog | 18개 |
| straight_leg_raise | 18개 |
| side_plank | 18개 |

---

## 세부 진행 상황

### lunge (런지)

| 세계관 | perfect | good | normal |
|--------|---------|------|--------|
| fantasy | ⏳ | ⏳ | ⏳ |
| sports | ⏳ | ⏳ | ⏳ |
| idol | ⏳ | ⏳ | ⏳ |
| sf | ⏳ | ⏳ | ⏳ |
| zombie | ⏳ | ⏳ | ⏳ |
| spy | ⏳ | ⏳ | ⏳ |

### bicep_curl (바이셉컬)

| 세계관 | perfect | good | normal |
|--------|---------|------|--------|
| fantasy | ⏳ | ⏳ | ⏳ |
| sports | ⏳ | ⏳ | ⏳ |
| idol | ⏳ | ⏳ | ⏳ |
| sf | ⏳ | ⏳ | ⏳ |
| zombie | ⏳ | ⏳ | ⏳ |
| spy | ⏳ | ⏳ | ⏳ |

### arm_raise (암레이즈)

| 세계관 | perfect | good | normal |
|--------|---------|------|--------|
| fantasy | ⏳ | ⏳ | ⏳ |
| sports | ⏳ | ⏳ | ⏳ |
| idol | ⏳ | ⏳ | ⏳ |
| sf | ⏳ | ⏳ | ⏳ |
| zombie | ⏳ | ⏳ | ⏳ |
| spy | ⏳ | ⏳ | ⏳ |

---

## 실행 방법

### 0. 의존성 설치

```bash
cd scripts
pip install -r requirements.txt
```

### 1. API 키 설정

```bash
# Windows
set GEMINI_API_KEY=your_api_key_here

# Linux/Mac
export GEMINI_API_KEY=your_api_key_here
```

### 2. 스크립트 실행

```bash
cd scripts

# 신규 운동만 생성 (권장)
python generate_tts_gemini.py --new-only

# 특정 운동만 생성
python generate_tts_gemini.py --exercise lunge

# 특정 세계관만 생성
python generate_tts_gemini.py --worldview fantasy --new-only

# 테스트 (실제 생성 없이 확인)
python generate_tts_gemini.py --new-only --dry-run

# 실패한 항목 재시도
python generate_tts_gemini.py --retry-failed
```

### 3. 진행 상황 초기화

```bash
python generate_tts_gemini.py --reset
```

---

## 음성 설정

### 세계관별 캐릭터 & 음성

| 세계관 | 캐릭터 | 음성 | 특징 |
|--------|--------|------|------|
| fantasy | 현자 엘더린 | Zubenelgenubi | 지혜롭고 따뜻한 남성 |
| sports | 코치 박 | Algieba | 열정적이고 활기찬 남성 |
| idol | 매니저 수진 | Achernar | 밝고 친근한 여성 |
| sf | AI 아리아 | Autonoe | 차분하고 따뜻한 AI |
| zombie | 닥터 리 | Enceladus | 신뢰감 있는 의사 |
| spy | 핸들러 오메가 | Charon | 냉철하고 절제된 남성 |

### 등급별 스타일

| 등급 | 스타일 | 분위기 |
|------|--------|--------|
| perfect | dramatic/energetic | 최고의 칭찬, 환호 |
| good | expressive/gentle | 따뜻한 격려 |
| normal | expressive/gentle | 희망찬 응원 |

---

## 예상 소요 시간

- 총 54개 파일
- API 호출 간격: 8초 (Rate limit 방지)
- 예상 시간: 약 8분

---

## 트러블슈팅

### Rate Limit 오류 (429)

```
[RATE_LIMIT] 재시도 횟수 초과
```

- Flash 모델 → Pro 모델로 자동 폴백
- Pro도 제한 시 대기 후 재시도
- 계속 실패 시 `--retry-failed`로 재시도

### 할당량 초과 (403)

```
[QUOTA] 할당량 초과 - 한도 리셋 필요
```

- Gemini API 일일/월간 한도 도달
- 한도 리셋까지 대기 필요
- Google AI Studio에서 할당량 확인

### 스토리 텍스트 없음

```
[WARN] 텍스트 없음: fantasy/lunge_perfect
```

- `all_stories.json` 파일 확인
- 해당 운동/등급 스토리 추가 필요

---

## 파일 구조

```
public/assets/prerendered/
├── tts/
│   ├── fantasy/
│   │   ├── squat_perfect.wav    ✅
│   │   ├── squat_good.wav       ✅
│   │   ├── squat_normal.wav     ✅
│   │   ├── lunge_perfect.wav    ⏳ 생성 필요
│   │   ├── lunge_good.wav       ⏳ 생성 필요
│   │   ├── lunge_normal.wav     ⏳ 생성 필요
│   │   ├── bicep_curl_*.wav     ⏳ 생성 필요
│   │   ├── arm_raise_*.wav      ⏳ 생성 필요
│   │   ├── high_knees_*.wav     ✅
│   │   └── plank_hold_*.wav     ✅
│   ├── sports/
│   ├── idol/
│   ├── sf/
│   ├── zombie/
│   └── spy/
├── tts_backup/                   (백업된 구 TTS)
│   ├── fantasy/
│   │   ├── bridge_*.wav
│   │   ├── dead_bug_*.wav
│   │   └── ...
│   └── ...
└── stories/
    └── all_stories.json
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2025-01-18 | MVP 리팩토링으로 6개 운동으로 축소 |
| 2025-01-18 | 신규 운동 3개 TTS 생성 대기 (lunge, bicep_curl, arm_raise) |
| 2025-01-18 | 구 운동 TTS 백업 완료 (bridge 등 5개) |
