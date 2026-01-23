# 재활 앱 프로그램 시나리오 (급성–아급성–만성)  
> **수정된 운동 전체 목록**을 기준으로 단계별 처방/진행/안전 기준을 정리한 문서입니다.  
> 핵심: 웹캠(2D) 환경에서 **안전성 + 인식 안정성 + 임상 타당성**을 동시에 만족시키는 구성

---

## 0. 수정된 운동 전체 목록(요약)

### A. 전신 운동 (Pose)
- 하체: `squat`, `wall_squat`, `chair_stand`, `straight_leg_raise`, `standing_march_slow`, `seated_knee_lift`
- 상체: `standing_arm_raise_front`, `shoulder_abduction`, `elbow_flexion`, `wall_push`
- 코어/체간: `seated_core_hold`, `standing_anti_extension_hold`, `standing_arm_raise_core`, `bridge`
- 확장(연구): `dead_bug`, `bird_dog`  
- 제외(비권장): `plank_hold`, `side_plank`, `high_knees`

### B. 손 재활 운동 (Hands)
- ROM: `finger_flexion`, `finger_spread`, `wrist_flexion`
- 힘줄/협응: `tendon_glide`, `thumb_opposition`, `grip_squeeze`(상대 수축 지수)
- 기능/정밀: `pinch_hold`, `finger_tap_sequence`, `reach_and_touch`

---

## 1. 단계 분류(앱 적용 관점)
의학적 “기간”만으로 나누면 사용자 다양성이 커서 앱에서 흔들릴 수 있습니다.  
따라서 앱에서는 아래처럼 **기능/통증 기반 레벨링**을 권장합니다.

- **급성(보호/통증 조절)**: 통증↑, 피로↑, ROM 제한, 균형 불안
- **아급성(운동 재교육/근지구력)**: 통증 안정화, ROM 회복 중, 패턴 학습 필요
- **만성(기능/통합/유지)**: 일상 기능 향상, 내구성/협응, 게임화 가능

---

## 2. 공통 안전 규칙(필수)
- **통증(VAS)**  
  - 운동 중/후 VAS 5 이상 → 강도↓ 또는 중단  
  - 다음날 통증 악화(24시간) → 이전 단계로 후퇴
- **피로(RPE)**  
  - RPE 13 이상이 지속 → 세트/시간 감소
- **낙상 위험**  
  - standing 동작은 “벽/의자 지지 옵션” 제공  
  - `standing_march_slow`는 급성기에서 보조 필수로 시작
- **인식 품질(웹캠)**  
  - 주요 관절 visibility 낮은 프레임은 점수/카운트에서 제외  
  - 연속 실패 시 “카메라 거리/각도/조명” 가이드 출력

---

## 3. 급성기(보호/통증조절) 시나리오

### 목표
- 통증 악화 방지, 기본 가동성 회복, 안전한 체간 안정화
- **느림/홀드 중심**, 앉거나 누운 자세 우선

### 빈도/강도(권장)
- 주 5~7일, 10~15분
- 1~2세트, 5~8회 또는 10~20초 홀드
- 템포: 3초 들기/3초 내리기(가능 시)

### 급성기 추천 루틴(예시 12~15분)
**전신(Pose)**
1) `seated_core_hold` 10~20초 × 2  
2) `seated_knee_lift` 5~8회 × 1~2  
3) `straight_leg_raise` 5~8회 × 1~2  
4) `bridge` 5~10초 홀드 × 5회 (통증 없을 때)  
5) `wall_squat` (아주 얕게) 10초 홀드 × 3 (가능 시)

**손(Hands)**
1) `tendon_glide` 5제스처 1세트  
2) `thumb_opposition` 각 손가락 3회  
3) `finger_flexion` 6~10회  
4) `wrist_flexion` 6~10회(통증 없는 범위)

### 급성기 진행 기준(→ 아급성)
- 운동 후 24시간 통증 악화 없음(최소 1주)
- ROM 지표 개선(예: thumb-opposition 거리 감소, finger_spread 증가)
- 보상동작 감소(상체 과기울기/어깨 들썩임 등)

---

## 4. 아급성기(운동 재교육/근지구력) 시나리오

### 목표
- 패턴 재학습(정렬/속도/협응), 근지구력 향상
- **반복운동 + 가벼운 협응** 도입

### 빈도/강도(권장)
- 주 3~5일, 15~25분
- 2~3세트, 8~12회
- 홀드: 15~30초(코어)

### 아급성기 추천 루틴(예시 20분)
**하체**
- `chair_stand` 8~12회 × 2  
- `squat` (얕게) 8~10회 × 2  
- `standing_march_slow` 20~30초 × 2 (지지 옵션)

**상체**
- `standing_arm_raise_front` 8~12회 × 2  
- `elbow_flexion` 8~12회 × 2  
- `wall_push` 8~12회 × 2  

**코어**
- `standing_anti_extension_hold` 15~30초 × 2  
- `standing_arm_raise_core` 6~10회 × 2(체간 흔들림 최소)

**손**
- `pinch_hold` 5~10초 × 5  
- `finger_tap_sequence` 1~2세트(정확도 우선)  
- `grip_squeeze` 6~10회(상대 수축 지수로 피드백)  

### 아급성기 진행 기준(→ 만성)
- 폼 점수(정렬/범위/속도) 일정 기준 이상(예: 80% 프레임 충족)
- 동일 루틴에서 RPE 감소 또는 반복수/유지시간 증가(2주 연속)
- standing 계열에서 균형/보상 안정화

---

## 5. 만성기(기능/통합/유지) 시나리오

### 목표
- ADL 유사 기능 과제, 양측 협응, 내구성(지구력)
- **전신 + 손 통합** 및 게임화(미션/점수/VRM 아바타) 강화

### 빈도/강도(권장)
- 주 2~4일, 20~35분
- 3세트, 10~15회 + 기능 미션(타이머)

### 만성기 추천 루틴(예시 30분)
**전신 통합**
- `squat` 10~15회 × 3 (ROM 목표 점진 증가)
- `standing_arm_raise_core` 10회 × 3 (체간 흔들림 감점)
- `standing_march_slow` 40~60초 × 2 (리듬/방향 변형은 안전 확보 후)

**상체/기능**
- `wall_push` 12~15회 × 3
- `shoulder_abduction` 10~12회 × 2(통증/충돌 주의, ROM 제한 옵션)

**손 기능**
- `reach_and_touch` 1~2분 미션(목표 점 터치 정확도/시간)
- `finger_tap_sequence` 2세트(오류율 감소 목표)
- `thumb_opposition` “정확도 챌린지”(속도보다 정확)

### 유지/재발 방지 지표(앱 트래킹)
- 수행률(주간 adherence)
- 기능 지표:
  - `chair_stand` 30초 반복수
  - `thumb_opposition` 성공률/평균 거리
  - `pinch_hold` 유지 시간
- 보상동작 빈도(경고 횟수) 감소

---

## 6. 앱 레벨 시스템(권장 UX)
- **Level 1(급성)**: Hold/Slow + 작은 ROM + 앉거나 누워서
- **Level 2(아급성)**: Rep 기반 + 폼 점수화(범위/정렬/속도)
- **Level 3(만성)**: 통합 미션 + 게임화 + 내구성(시간/세트)

---

## 7. 확장(연구) 운동 적용 기준
- `dead_bug`, `bird_dog`는 다음 조건에서만 권장:
  - 카메라 위치/각도 고정(가림 최소)
  - 사용자가 기본 코어/정렬을 충분히 습득(Level 2 후반 이상)
  - 낙상/통증 리스크 낮음
- 제외 유지: `plank_hold`, `side_plank`, `high_knees`
  - 바닥자세/가림/안전/속도 문제로 웹캠 MVP에 부적합
