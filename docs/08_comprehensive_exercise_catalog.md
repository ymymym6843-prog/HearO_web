# HearO 운동 종합 카탈로그 v2.0
> 웹캠 환경/재활 안전성/인식 안정성 기준 재구성

---

## (a) 최종 운동 목록 표

### A. 전신 운동 (Pose 기반) - 18개

#### A-1. 하체 운동 (6개)

| ID | 한글명 | 대분류 | 중분류 | MVP | 인식엔진 | 측정지표 | 인식난이도 | 실패조건 |
|----|--------|--------|--------|-----|----------|----------|------------|----------|
| `squat` | 스쿼트 | 전신/Pose | 하체 | ✅ | MediaPipe Pose | 무릎각도(hip-knee-ankle) | 쉬움 | 무릎/발목 프레임 이탈 |
| `wall_squat` | 벽 스쿼트 | 전신/Pose | 하체 | ✅ | MediaPipe Pose | 무릎각도 + 유지시간 | 쉬움 | 측면 카메라 필요 |
| `chair_stand` | 의자 앉았다 일어나기 | 전신/Pose | 하체 | ✅ | MediaPipe Pose | hip.y-knee.y 높이차 | 쉬움 | 의자 가림, 카메라 높이 |
| `straight_leg_raise` | 누워서 다리 들기 | 전신/Pose | 하체 | ✅ | MediaPipe Pose | hip.y-ankle.y 높이차 | 보통 | 누운 자세 인식 불안정 |
| `standing_march_slow` | 서서 천천히 행진 | 전신/Pose | 하체 | ✅ | MediaPipe Pose | 좌우 무릎 들림 교대 | 보통 | 속도 과다, 균형 불안 |
| `seated_knee_lift` | 앉아서 무릎 들기 | 전신/Pose | 하체 | ✅ | MediaPipe Pose | hip.y-knee.y + 상체기울기 | 쉬움 | 상체 보상 과다 |

#### A-2. 상체 운동 (4개)

| ID | 한글명 | 대분류 | 중분류 | MVP | 인식엔진 | 측정지표 | 인식난이도 | 실패조건 |
|----|--------|--------|--------|-----|----------|----------|------------|----------|
| `standing_arm_raise_front` | 팔 앞으로 들기 | 전신/Pose | 상체 | ✅ | MediaPipe Pose | wrist.y-shoulder.y + 팔꿈치각 | 쉬움 | 팔 프레임 이탈 |
| `shoulder_abduction` | 어깨 벌리기 | 전신/Pose | 상체 | ✅ | MediaPipe Pose | wrist.x-shoulder.x 측면이동 | 보통 | 정면 카메라 깊이 추정 한계 |
| `elbow_flexion` | 팔꿈치 굽히기 | 전신/Pose | 상체 | ✅ | MediaPipe Pose | 팔꿈치각도(sh-el-wr) | 쉬움 | 측면 시야 제한 |
| `wall_push` | 벽 밀기 | 전신/Pose | 상체 | ✅ | MediaPipe Pose | 팔꿈치각도 + 체간기울기 | 보통 | 벽 인식 불가, 측면 필요 |

#### A-3. 코어/체간 운동 (4개)

| ID | 한글명 | 대분류 | 중분류 | MVP | 인식엔진 | 측정지표 | 인식난이도 | 실패조건 |
|----|--------|--------|--------|-----|----------|----------|------------|----------|
| `seated_core_hold` | 앉아서 코어 버티기 | 전신/Pose | 코어 | ✅ | MediaPipe Pose | 어깨-엉덩이 정렬(sway) | 쉬움 | 좌우 흔들림 과다 |
| `standing_anti_extension_hold` | 서서 허리 버티기 | 전신/Pose | 코어 | ✅ | MediaPipe Pose | 어깨-엉덩이-무릎 정렬 | 보통 | 과신전/과굴곡 |
| `standing_arm_raise_core` | 코어 유지 팔들기 | 전신/Pose | 코어 | ✅ | MediaPipe Pose | 팔높이 + 체간sway 페널티 | 보통 | 보상동작 과다 |
| `bridge` | 브릿지 | 전신/Pose | 코어 | ✅ | MediaPipe Pose | hip높이 + 골반기울기 | 보통 | 누운자세 가림 |

#### A-4. 확장/연구용 (2개) - MVP 제외

| ID | 한글명 | 대분류 | 중분류 | MVP | 인식엔진 | 제외 이유 |
|----|--------|--------|--------|-----|----------|-----------|
| `dead_bug` | 데드버그 | 전신/Pose | 전신협응 | ⚠️확장 | MediaPipe Pose | 누운자세 가림, 사지 동시 추적 어려움 |
| `bird_dog` | 버드독 | 전신/Pose | 전신협응 | ⚠️확장 | MediaPipe Pose | 네발기기 자세 가림, 대각선 패턴 복잡 |

#### A-5. 제외 운동 (3개) - 비권장

| ID | 한글명 | 제외 이유 |
|----|--------|-----------|
| `plank_hold` | 플랭크 홀드 | 바닥자세로 얼굴/몸통 가림, 팔꿈치 손목 부상 위험, 초보자 코어 불안정 |
| `side_plank` | 사이드 플랭크 | 측면 바닥자세 인식 어려움, 어깨/손목 부상 위험, 균형 요구 높음 |
| `high_knees` | 하이니즈 | 빠른 속도로 오인식 증가, 심폐 부하 높음, 낙상/충격 위험 |

---

### B. 손 재활 운동 (Hands 기반) - 9개

#### B-1. 가동성/ROM (3개)

| ID | 한글명 | 대분류 | 중분류 | MVP | 인식엔진 | 측정지표 | 인식난이도 | 실패조건 |
|----|--------|--------|--------|-----|----------|----------|------------|----------|
| `finger_flexion` | 손가락 굽혔다 펴기 | 손/Hands | ROM | ✅ | MediaPipe Hands | MCP/PIP/DIP 각도, 굴곡비율 | 쉬움 | 손 프레임 이탈, 역광 |
| `finger_spread` | 손가락 벌리기 | 손/Hands | ROM | ✅ | MediaPipe Hands | 인접 손가락팁 간 정규화 거리 | 쉬움 | 손등/손바닥 방향 혼동 |
| `wrist_flexion` | 손목 굽히기/펴기 | 손/Hands | ROM | ✅ | MediaPipe Hands | 전완-손 2D각도(근사) | 보통 | 단일 카메라 3D 한계 |

#### B-2. 힘줄/협응 (3개)

| ID | 한글명 | 대분류 | 중분류 | MVP | 인식엔진 | 측정지표 | 인식난이도 | 실패조건 |
|----|--------|--------|--------|-----|----------|----------|------------|----------|
| `tendon_glide` | 힘줄 글라이딩 | 손/Hands | 협응 | ✅ | MediaPipe Hands | 5가지 제스처 패턴 매칭 | 보통 | 제스처 간 유사도 높음 |
| `thumb_opposition` | 엄지-손가락 터치 | 손/Hands | 협응 | ✅ | MediaPipe Hands | thumb_tip-finger_tip 정규화 거리 | 쉬움 | 손가락 겹침 인식 오류 |
| `grip_squeeze` | 주먹 쥐기 | 손/Hands | 협응 | ✅ | MediaPipe Hands | **영상 기반 상대 수축 지수**(굴곡 비율 0~100%) | 쉬움 | ⚠️실제 악력 아님 |

#### B-3. 기능/정밀 (3개)

| ID | 한글명 | 대분류 | 중분류 | MVP | 인식엔진 | 측정지표 | 인식난이도 | 실패조건 |
|----|--------|--------|--------|-----|----------|----------|------------|----------|
| `pinch_hold` | 집게 집기 유지 | 손/Hands | 정밀 | ✅ | MediaPipe Hands | thumb_tip-index_tip 거리 + 유지시간 | 쉬움 | 손가락 떨림 |
| `finger_tap_sequence` | 손가락 순차 터치 | 손/Hands | 정밀 | ✅ | MediaPipe Hands | 엄지→검지→중지→약지→새끼 순서 정확도 | 보통 | 순서 오류, 속도 과다 |
| `reach_and_touch` | 목표 터치 | 손/Hands | 정밀 | ✅ | Hands+Pose | 화면 목표점-손끝 좌표 거리 | 보통 | 상지 보상동작 |

---

## (b) MVP 세트 (22개) 및 선정 이유

### 전신 운동 MVP (14개)

| 분류 | 운동 | 선정 이유 |
|------|------|-----------|
| 하체 | `squat` | 기본 하지 근력, 무릎각도 인식 안정적 |
| 하체 | `wall_squat` | 등척성 홀드로 안전, 급성기 적합 |
| 하체 | `chair_stand` | ADL 기능평가 표준, 낙상 예방 |
| 하체 | `straight_leg_raise` | 고관절 굴곡근/대퇴사두 강화, 누운 자세 안전 |
| 하체 | `standing_march_slow` | 보행 패턴 재교육, 균형 훈련 |
| 하체 | `seated_knee_lift` | 앉은 자세로 안전, 급성기 적합 |
| 상체 | `standing_arm_raise_front` | 어깨 굴곡 ROM, 인식 쉬움 |
| 상체 | `shoulder_abduction` | 어깨 외전, 회전근개 재활 필수 |
| 상체 | `elbow_flexion` | 팔꿈치 ROM, 상지 근력 기본 |
| 상체 | `wall_push` | 푸쉬업 대안, 견갑골 안정화 |
| 코어 | `seated_core_hold` | 앉은 코어 안정화, 급성기 안전 |
| 코어 | `standing_anti_extension_hold` | 요추 중립 유지, 허리 재활 필수 |
| 코어 | `standing_arm_raise_core` | 체간 안정성 + 상지 통합 |
| 코어 | `bridge` | 둔근/체간 활성화, 요추 재활 표준 |

### 손 재활 MVP (8개)

| 분류 | 운동 | 선정 이유 |
|------|------|-----------|
| ROM | `finger_flexion` | MCP/PIP/DIP 가동성, 수부 재활 기본 |
| ROM | `finger_spread` | 내재근 활성화, 손 기능 기본 |
| ROM | `wrist_flexion` | 손목 가동성, 건초염/터널증후군 재활 |
| 협응 | `tendon_glide` | 힘줄 유착 방지, 수술 후 필수 |
| 협응 | `thumb_opposition` | 엄지 대립, 악력/집기 기능 기반 |
| 협응 | `grip_squeeze` | 굴곡 패턴, **상대 수축 지수로 피드백** |
| 정밀 | `pinch_hold` | 정밀 집기 지구력, ADL 필수 |
| 정밀 | `finger_tap_sequence` | 손가락 분리 운동, 협응력 |

**총 22개 (전신 14 + 손 8)**

---

## (c) 운동별 판정 로직 개요

### 공통 원칙

#### 1. 신체 비율 기반 정규화
```typescript
// Pose: 어깨 폭 + 몸통 길이 기반
const bodyScale = (shoulderWidth + torsoLength) / 2;
const normalizedDist = rawDistance / bodyScale;

// Hands: 손바닥 폭 기반
const handScale = dist(INDEX_MCP, PINKY_MCP);
const normalizedDist = rawDistance / handScale;
```

#### 2. Visibility 필터링
```typescript
const MIN_VISIBILITY = 0.6;
function isVisible(...landmarks: Landmark[]): boolean {
  return landmarks.every(lm => (lm.visibility ?? 1.0) >= MIN_VISIBILITY);
}
// visibility 낮은 프레임은 판정에서 제외
```

#### 3. EMA 스무딩
```typescript
function ema(prev: number | null, curr: number, alpha = 0.2): number {
  if (prev === null) return curr;
  return prev * (1 - alpha) + curr * alpha;
}
```

#### 4. 상태 머신 + 히스테리시스
```typescript
type RepState = 'DOWN' | 'UP' | 'HOLD';

interface RepCounter {
  state: RepState;
  reps: number;
  downThreshold: number;  // DOWN→UP 전환 임계값
  upThreshold: number;    // UP→DOWN 전환 임계값 (다르게 설정)
}

// 예: squat (big_is_down 모드)
// DOWN(펴짐) > 160° → UP(굽힘) < 100° 전환
// UP(굽힘) < 100° → DOWN(펴짐) > 150° 전환 (히스테리시스 10°)
```

---

### 전신 운동 판정 로직

#### 하체

| 운동 | 상태머신 모드 | 주요 지표 | DOWN 임계값 | UP 임계값 | 홀드 시간 |
|------|---------------|-----------|-------------|-----------|-----------|
| `squat` | big_is_down | knee_angle | >160° | <100° | - |
| `wall_squat` | hold_mode | knee_angle | 80~110° 유지 | - | 10~60초 |
| `chair_stand` | big_is_down | hip.y - knee.y | >0.05 (서있음) | <-0.02 (앉음) | - |
| `straight_leg_raise` | big_is_up | hip.y - ankle.y | <0.05 | >0.15 | 3~5초 |
| `standing_march_slow` | alternating | L/R knee lift | <0.02 | >0.08 | - |
| `seated_knee_lift` | big_is_up | hip.y - knee.y | <0.02 | >0.08 | - |

#### 상체

| 운동 | 상태머신 모드 | 주요 지표 | DOWN 임계값 | UP 임계값 | 보조 지표 |
|------|---------------|-----------|-------------|-----------|-----------|
| `standing_arm_raise_front` | big_is_up | wrist.y - shoulder.y | <0.02 | >0.12 | elbow_angle>150° |
| `shoulder_abduction` | big_is_up | abs(wrist.x - shoulder.x) | <0.05 | >0.20 | elbow_angle>150° |
| `elbow_flexion` | big_is_down | elbow_angle | >160° | <60° | - |
| `wall_push` | big_is_down | elbow_angle | >160° | <90° | trunk_tilt |

#### 코어

| 운동 | 상태머신 모드 | 주요 지표 | 기준 범위 | 페널티 조건 |
|------|---------------|-----------|-----------|-------------|
| `seated_core_hold` | hold_mode | shoulder_hip_sway | <0.03 | sway>0.05 |
| `standing_anti_extension_hold` | hold_mode | trunk_alignment | 0.95~1.05 | 과신전/과굴곡 |
| `standing_arm_raise_core` | big_is_up + penalty | wrist_height | >0.12 | sway>0.04 감점 |
| `bridge` | big_is_up | hip_lift | >0.08 | pelvic_tilt>0.03 |

---

### 손 운동 판정 로직

| 운동 | 상태머신 모드 | 주요 지표 | 성공 임계값 | 특이사항 |
|------|---------------|-----------|-------------|----------|
| `finger_flexion` | big_is_down | tip-mcp 정규화 거리 | <0.3 (굽힘) | 5손가락 평균 |
| `finger_spread` | big_is_up | 인접 팁 거리 평균 | >0.4 | 4쌍 평균 |
| `wrist_flexion` | alternating | 전완-손 2D 각도 | 굴곡<70°, 신전>110° | 근사값 |
| `tendon_glide` | gesture_match | 5제스처 패턴 | 매칭 스코어>0.8 | 규칙 기반 |
| `thumb_opposition` | touch_detect | thumb-finger 거리 | <0.25 | 순차 터치 |
| `grip_squeeze` | big_is_down | 평균 굴곡 비율 | 0~100% | **상대 수축 지수** |
| `pinch_hold` | hold_mode | thumb-index 거리 | <0.20 유지 | 5~10초 |
| `finger_tap_sequence` | sequence | 순차 터치 정확도 | 순서 일치 | 속도 제한 |
| `reach_and_touch` | position | 손끝-목표 거리 | <0.10 | Pose+Hands |

---

## (d) 급성-아급성-만성 단계별 처방 시나리오

### 공통 안전 규칙

| 지표 | 기준 | 대응 |
|------|------|------|
| **통증 (VAS)** | 운동 중/후 VAS ≥5 | 강도↓ 또는 중단 |
| **피로 (RPE)** | RPE ≥13 지속 | 세트/시간 감소 |
| **다음날 통증** | 24시간 후 악화 | 이전 단계로 후퇴 |
| **낙상 위험** | 균형 불안정 | 벽/의자 지지 필수 |
| **인식 품질** | visibility 낮음 연속 | 카메라 위치 가이드 |

---

### 급성기 (보호/통증 조절)

#### 특징
- 통증↑, 피로↑, ROM 제한, 균형 불안
- **느림/홀드 중심**, 앉거나 누운 자세 우선

#### 빈도/강도
| 항목 | 권장값 |
|------|--------|
| 빈도 | 주 5~7일 |
| 시간 | 10~15분 |
| 세트 | 1~2세트 |
| 반복 | 5~8회 또는 홀드 10~20초 |
| 템포 | 3초 올리기 / 3초 내리기 |

#### 급성기 루틴 예시 (12분)

**전신 (8분)**
1. `seated_core_hold` - 15초 × 2세트
2. `seated_knee_lift` - 6회 × 2세트
3. `straight_leg_raise` - 6회 × 1세트
4. `bridge` - 5초 홀드 × 5회
5. `wall_squat` (얕게) - 10초 × 2세트

**손 (4분)**
1. `tendon_glide` - 5제스처 × 1세트
2. `thumb_opposition` - 각 손가락 3회
3. `finger_flexion` - 8회
4. `wrist_flexion` - 8회

#### 진행 기준 (→아급성)
- [ ] 운동 후 24시간 통증 악화 없음 (최소 1주)
- [ ] ROM 지표 개선 (thumb-opposition 거리↓, finger_spread↑)
- [ ] 보상동작 감소 (상체 기울기 경고 횟수↓)

---

### 아급성기 (운동 재교육/근지구력)

#### 특징
- 통증 안정화, ROM 회복 중, 패턴 학습 필요
- **반복운동 + 가벼운 협응** 도입

#### 빈도/강도
| 항목 | 권장값 |
|------|--------|
| 빈도 | 주 3~5일 |
| 시간 | 15~25분 |
| 세트 | 2~3세트 |
| 반복 | 8~12회 |
| 홀드 | 15~30초 |

#### 아급성기 루틴 예시 (20분)

**하체 (6분)**
1. `chair_stand` - 10회 × 2세트
2. `squat` (얕게) - 8회 × 2세트
3. `standing_march_slow` - 25초 × 2세트

**상체 (6분)**
1. `standing_arm_raise_front` - 10회 × 2세트
2. `elbow_flexion` - 10회 × 2세트
3. `wall_push` - 10회 × 2세트

**코어 (4분)**
1. `standing_anti_extension_hold` - 20초 × 2세트
2. `standing_arm_raise_core` - 8회 × 2세트

**손 (4분)**
1. `pinch_hold` - 8초 × 5회
2. `finger_tap_sequence` - 1세트 (정확도 우선)
3. `grip_squeeze` - 8회

#### 진행 기준 (→만성)
- [ ] 폼 점수 80% 이상 (정렬/범위/속도)
- [ ] 동일 루틴 RPE 감소 (2주 연속)
- [ ] standing 계열 균형 안정화

---

### 만성기 (기능/통합/유지)

#### 특징
- 일상 기능 향상, 내구성/협응
- **전신+손 통합**, 게임화 강화

#### 빈도/강도
| 항목 | 권장값 |
|------|--------|
| 빈도 | 주 2~4일 |
| 시간 | 20~35분 |
| 세트 | 3세트 |
| 반복 | 10~15회 |
| 미션 | 타이머 챌린지 |

#### 만성기 루틴 예시 (30분)

**전신 통합 (15분)**
1. `squat` - 12회 × 3세트 (ROM 증가)
2. `standing_arm_raise_core` - 10회 × 3세트 (sway 감점)
3. `standing_march_slow` - 50초 × 2세트

**상체/기능 (8분)**
1. `wall_push` - 12회 × 3세트
2. `shoulder_abduction` - 10회 × 2세트 (ROM 제한 옵션)

**손 기능 (7분)**
1. `reach_and_touch` - 90초 미션 (정확도/시간)
2. `finger_tap_sequence` - 2세트 (오류율↓)
3. `thumb_opposition` 챌린지 - 속도<정확도

#### 유지 지표 (앱 트래킹)
- 주간 수행률 (adherence)
- `chair_stand` 30초 반복수
- `thumb_opposition` 성공률
- `pinch_hold` 유지 시간
- 보상동작 경고 횟수 추이

---

## 앱 레벨 시스템 (UX 권장)

| Level | 단계 | 특징 | 게임화 |
|-------|------|------|--------|
| **Lv.1** | 급성기 | Hold/Slow, 작은ROM, 앉거나 누운 자세 | 스토리 도입부 |
| **Lv.2** | 아급성기 | Rep 기반, 폼 점수화 | 캐릭터 성장 |
| **Lv.3** | 만성기 | 통합 미션, 내구성 챌린지 | 보스전/랭킹 |

---

## 버전 이력
- v2.0 (2025-01-23): 웹캠/재활/인식 기준 재구성, MVP 22개 확정
- v1.0: 초기 8+6+7 구성
