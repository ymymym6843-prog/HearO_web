# MediaPipe(Pose/Hands) 기반 운동 판정 로직 (수정된 운동 전체 목록 기준)
> 대상: 웹캠 기반 재활/운동 앱(MVP + 확장)  
> 스택 예: **MediaPipe Pose**, **MediaPipe Hands** (필요 시 MoveNet/PoseDetection 보완), 시각화 **VRMAnimator**

---

## 0. 수정된 운동 전체 목록(요약)

### A. 전신 운동 (Pose 기반)
- **하체**
  - `squat` 스쿼트 ✅MVP
  - `wall_squat` 벽 스쿼트(홀드) ✅MVP
  - `chair_stand` 의자 앉았다 일어나기 ✅MVP
  - `straight_leg_raise` 누워서 다리 들기 ✅MVP
  - `standing_march_slow` 서서 천천히 행진 ✅MVP
  - `seated_knee_lift` 앉아서 무릎 들기 ✅MVP
- **상체**
  - `standing_arm_raise_front` 서서 팔 앞으로 들기 ✅MVP
  - `shoulder_abduction` 어깨 벌리기(측면 레이즈) ✅MVP
  - `elbow_flexion` 팔꿈치 굽히기(재활형 컬) ✅MVP
  - `wall_push` 벽 밀기 ✅MVP
- **코어/체간 안정화**
  - `seated_core_hold` 앉아서 코어 버티기 ✅MVP
  - `standing_anti_extension_hold` 서서 허리 버티기(복압/중립 유지) ✅MVP
  - `standing_arm_raise_core` 코어 유지하며 팔 들기 ✅MVP
  - `bridge` 브릿지 ✅MVP(엉덩/체간 안정화)
- **연구/확장(웹캠 난이도↑, 가림/안전 이슈)**
  - `dead_bug` 데드버그 ⚠️확장
  - `bird_dog` 버드독 ⚠️확장
  - `plank_hold` 플랭크 홀드 ❌(웹캠/안전 부적합)
  - `side_plank` 사이드 플랭크 ❌(웹캠/안전 부적합)
  - `high_knees` 하이니즈 ❌(속도/충격/오인식↑)

### B. 손 재활 운동 (Hands 기반)
- **가동성/ROM**
  - `finger_flexion` 손가락 굽혔다 펴기 ✅MVP
  - `finger_spread` 손가락 벌리기 ✅MVP
  - `wrist_flexion` 손목 굽히기/펴기 ✅MVP(영상기반 2D/근사)
- **힘줄/협응**
  - `tendon_glide` 힘줄 글라이딩(5 제스처) ✅MVP
  - `thumb_opposition` 엄지-손가락 터치 ✅MVP
  - `grip_squeeze` 주먹 쥐기 ✅MVP(⚠️실제 악력 아님: “상대 수축 지수”)
- **기능/정밀**
  - `pinch_hold` 집게(핀치) 유지 ✅MVP
  - `finger_tap_sequence` 손가락 순차 터치 ✅MVP
  - `reach_and_touch` 화면 목표 터치(상지+손 통합) ✅MVP(Hands+Pose 혼합)

---

## 1. 웹캠 환경 기본 원칙(실무 체크리스트)

### 1) 스케일 정규화(거리/화각 차이 대응)
- **Pose**: 어깨 폭 + 몸통 길이(어깨-엉덩이)로 `scale` 정의 후 거리 기반 지표를 정규화
- **Hands**: 손바닥 폭(예: INDEX_MCP–PINKY_MCP)로 `hand_scale` 정의

### 2) 신뢰도(visibility/presence) 기반 프레임 필터링
- 관절 `visibility`가 낮으면 **해당 프레임은 판정에서 제외**
- 제외가 연속되면 UI에서 “카메라 위치/조명/거리” 가이드 표시

### 3) 스무딩(EMA) + 히스테리시스(임계값 상하 분리)
- 좌표/각도/거리 지표는 **EMA**로 안정화
- 카운트는 `DOWN`/`UP` 상태 머신으로 처리하며, **UP 임계값과 DOWN 임계값을 다르게** 잡아 흔들림을 줄임

---

## 2. 공통 유틸 의사코드 (Pose/Hands 공용)

```python
# =========================
# 공통 유틸: 벡터/각도/거리
# =========================

def vec(a, b):
    # 점 a -> b 벡터
    return (b.x - a.x, b.y - a.y, b.z - a.z)

def dot(u, v):
    return u[0]*v[0] + u[1]*v[1] + u[2]*v[2]

def norm(u):
    return (u[0]**2 + u[1]**2 + u[2]**2) ** 0.5

def angle_3pts(a, b, c):
    """a-b-c 3점으로 이루는 관절각(도)"""
    u = vec(b, a)
    v = vec(b, c)
    denom = max(norm(u) * norm(v), 1e-6)
    cos_theta = max(min(dot(u, v) / denom, 1.0), -1.0)
    return arccos(cos_theta) * 180.0 / PI

def dist2d(a, b):
    dx = a.x - b.x
    dy = a.y - b.y
    return (dx*dx + dy*dy) ** 0.5

def ema(prev, curr, alpha=0.2):
    # 지수이동평균 스무딩
    if prev is None:
        return curr
    return prev*(1-alpha) + curr*alpha

def clamp(x, lo, hi):
    return max(lo, min(hi, x))
```

---

## 3. 정규화(Scale) 정의

### 3-1) Pose scale
```python
def get_body_scale(pose):
    L_sh, R_sh = pose.left_shoulder, pose.right_shoulder
    L_hip, R_hip = pose.left_hip, pose.right_hip

    shoulder_width = dist2d(L_sh, R_sh)
    torso_len = (dist2d(L_sh, L_hip) + dist2d(R_sh, R_hip)) / 2.0

    return max((shoulder_width + torso_len) / 2.0, 1e-3)

def norm_dist(a, b, scale):
    return dist2d(a, b) / max(scale, 1e-3)
```

### 3-2) Hands scale
```python
def get_hand_scale(hand):
    # 손바닥 폭 기반 정규화(개인/카메라 거리 보정)
    return max(dist2d(hand.INDEX_MCP, hand.PINKY_MCP), 1e-3)
```

---

## 4. 가시성 체크

```python
def is_visible(*landmarks, min_vis=0.6):
    for lm in landmarks:
        if getattr(lm, "visibility", 1.0) < min_vis:
            return False
    return True
```

> Hands는 구현체에 따라 visibility가 없을 수 있어요.  
> 그 경우 `handedness score` 또는 추적 confidence로 대체하고, 너무 불안정하면 프레임 제외로 처리합니다.

---

## 5. 반복 카운팅 상태 머신(히스테리시스 포함)

```python
class RepCounter:
    def __init__(self, down_th, up_th, mode="big_is_down"):
        """
        mode:
          - big_is_down: 값이 클수록 DOWN(예: 팔꿈치 각도: 펴짐이 큼)
          - big_is_up:   값이 클수록 UP  (예: 손목이 어깨보다 위: 위로 갈수록 값↑로 정의한 경우)
        """
        self.state = "DOWN"
        self.reps = 0
        self.down_th = down_th
        self.up_th = up_th
        self.mode = mode

    def update(self, value):
        if value is None:
            return

        if self.mode == "big_is_down":
            # DOWN(큰 값) -> UP(작은 값)
            if self.state == "DOWN" and value < self.up_th:
                self.state = "UP"
                self.reps += 1
            elif self.state == "UP" and value > self.down_th:
                self.state = "DOWN"
        else:
            # DOWN(작은 값) -> UP(큰 값)
            if self.state == "DOWN" and value > self.up_th:
                self.state = "UP"
                self.reps += 1
            elif self.state == "UP" and value < self.down_th:
                self.state = "DOWN"
```

---

## 6. 운동별 지표(메트릭) + 판정 포인트

아래 임계값은 **초기값(seed)** 입니다.  
실서비스에서는 **30초 캘리브레이션(개인 ROM/카메라 높이)** 로 `down_th/up_th`를 자동 보정하는 것을 권장합니다.

### 6-1) 하체

#### (1) squat 스쿼트
- **필요 관절**: (우/좌 선택) hip, knee, ankle  
- **지표**: `knee_angle = angle(hip, knee, ankle)` (굽힐수록 작아짐)
- **카운트**: big_is_down(펴짐이 큼)  
  - DOWN(펴짐): `> 160°`  
  - UP(굽힘): `< 90°`(얕게는 100~110도도 허용)

```python
def metric_squat(pose, side="right"):
    hip, knee, ankle = pose.right_hip, pose.right_knee, pose.right_ankle
    if side == "left":
        hip, knee, ankle = pose.left_hip, pose.left_knee, pose.left_ankle

    if not is_visible(hip, knee, ankle):
        return None

    return angle_3pts(hip, knee, ankle)
```

**실패 조건/주의**
- 카메라가 너무 낮거나, 무릎/발목이 프레임 밖이면 실패
- 무릎 valgus(안쪽 붕괴) 체크는 **양측 knee-x 차이**로 추가 가능(선택)

---

#### (2) chair_stand 의자 앉았다 일어나기
- **필요 관절**: hip, knee(+ optional shoulder)  
- **지표(간단)**: 힙이 무릎 대비 얼마나 낮은지 `hip.y - knee.y`  
- **보강 지표**: 무릎각 + 상체 기울기(보상)  
- **카운트**: big_is_down(힙이 더 아래일수록 DOWN으로 정의할 수 있음)

```python
def metric_chair_stand(pose, side="right"):
    hip, knee = pose.right_hip, pose.right_knee
    if side == "left":
        hip, knee = pose.left_hip, pose.left_knee

    if not is_visible(hip, knee):
        return None

    # y는 보통 아래로 갈수록 값이 커짐(이미지 좌표계)
    return (hip.y - knee.y)
```

**실패 조건/주의**
- 의자가 화면에 보일 필요는 없지만, 카메라 높이가 너무 높으면 hip/knee 구분이 불안정
- 낙상 위험: 급성/고령은 “벽/의자 지지” 안내

---

#### (3) wall_squat 벽 스쿼트(홀드)
- **필요 관절**: hip, knee, ankle  
- **지표**: 무릎각 `knee_angle`  
- **판정**: 목표 구간(예: 80~110도)을 **유지시간**으로 채점

```python
def metric_wall_squat(pose, side="right"):
    hip, knee, ankle = pose.right_hip, pose.right_knee, pose.right_ankle
    if side == "left":
        hip, knee, ankle = pose.left_hip, pose.left_knee, pose.left_ankle
    if not is_visible(hip, knee, ankle):
        return None
    return angle_3pts(hip, knee, ankle)
```

---

#### (4) straight_leg_raise 누워서 다리 들기(SLR)
- **필요 관절**: hip, knee, ankle  
- **지표(간단)**: `hip.y - ankle.y` (발목이 올라갈수록 증가하도록 정의)
- **판정**: 반복 또는 홀드(임상 단계에 따라)

```python
def metric_slr(pose, side="right"):
    hip, ankle = pose.right_hip, pose.right_ankle
    if side == "left":
        hip, ankle = pose.left_hip, pose.left_ankle
    if not is_visible(hip, ankle):
        return None
    return (hip.y - ankle.y)
```

---

#### (5) standing_march_slow 서서 천천히 행진
- **필요 관절**: hip, knee(양측)  
- **지표**: 좌/우 무릎 들림 `hip.y - knee.y`  
- **판정**: 좌우 교대 + 속도 제한(너무 빠르면 실패/경고)

```python
def metric_march(pose):
    L_hip, R_hip = pose.left_hip, pose.right_hip
    L_knee, R_knee = pose.left_knee, pose.right_knee
    if not is_visible(L_hip, R_hip, L_knee, R_knee):
        return None

    left_lift = (L_hip.y - L_knee.y)
    right_lift = (R_hip.y - R_knee.y)
    return left_lift, right_lift
```

---

#### (6) seated_knee_lift 앉아서 무릎 들기
- standing march와 동일 지표를 사용하되, **상체 기울기(보상)** 체크를 추가 권장  
- 지표(보상 예): 어깨-엉덩이 수직선 유지 정도

---

### 6-2) 상체

#### (7) standing_arm_raise_front 서서 팔 앞으로 들기
- **필요 관절**: shoulder, elbow, wrist  
- **지표 1**: 손목이 어깨보다 위로 얼마나 올라갔는지 `sh.y - wr.y`  
- **지표 2(정렬)**: 팔꿈치 펴짐 `elbow_angle`(보상/굴곡 체크)

```python
def metric_arm_raise_front(pose, side="right"):
    if side == "right":
        sh, el, wr = pose.right_shoulder, pose.right_elbow, pose.right_wrist
    else:
        sh, el, wr = pose.left_shoulder, pose.left_elbow, pose.left_wrist

    if not is_visible(sh, el, wr):
        return None

    wrist_above_shoulder = (sh.y - wr.y)
    elbow_angle = angle_3pts(sh, el, wr)
    return wrist_above_shoulder, elbow_angle
```

**카운트(예시)**  
- `wrist_above_shoulder` 기준 big_is_up 모드  
  - DOWN: `< 0.02` (어깨 아래)  
  - UP: `> 0.12` (어깨 위 충분히)

---

#### (8) shoulder_abduction 어깨 벌리기(측면 레이즈)
- **필요 관절**: shoulder, elbow, wrist  
- **지표**: “손목이 어깨보다 옆/위로 얼마나 이동했는지”를 조합  
  - 정면 웹캠에서는 x 방향(좌우)도 사용 가능  
- 안전: 통증/충돌증후군 있는 경우 ROM 제한 옵션 제공

```python
def metric_shoulder_abduction(pose, side="right"):
    if side == "right":
        sh, el, wr = pose.right_shoulder, pose.right_elbow, pose.right_wrist
    else:
        sh, el, wr = pose.left_shoulder, pose.left_elbow, pose.left_wrist

    if not is_visible(sh, el, wr):
        return None

    # 옆으로 벌릴수록 |wr.x - sh.x| 증가
    lateral = abs(wr.x - sh.x)
    elbow_angle = angle_3pts(sh, el, wr)
    return lateral, elbow_angle
```

---

#### (9) elbow_flexion 팔꿈치 굽히기(재활형 컬)
- **필요 관절**: shoulder, elbow, wrist  
- **지표**: `elbow_angle = angle(sh, el, wr)`  
- **카운트(예시)**: big_is_down  
  - DOWN(펴짐): `> 160°`  
  - UP(굽힘): `< 60°`

```python
def metric_elbow_flexion(pose, side="right"):
    sh, el, wr = (pose.right_shoulder, pose.right_elbow, pose.right_wrist) if side=="right"                  else (pose.left_shoulder, pose.left_elbow, pose.left_wrist)
    if not is_visible(sh, el, wr):
        return None
    return angle_3pts(sh, el, wr)
```

---

#### (10) wall_push 벽 밀기
- **필요 관절**: shoulder, elbow, wrist + hip(체간 보상 체크)  
- **지표**: 팔꿈치 각도 + 체간 기울기(선택)  
- **카운트**: 팔꿈치 각도 기반

```python
def metric_wall_push(pose, side="right"):
    sh, el, wr, hip = pose.right_shoulder, pose.right_elbow, pose.right_wrist, pose.right_hip
    if side == "left":
        sh, el, wr, hip = pose.left_shoulder, pose.left_elbow, pose.left_wrist, pose.left_hip

    if not is_visible(sh, el, wr, hip):
        return None

    elbow_angle = angle_3pts(sh, el, wr)
    # 보상 체크(옵션): 어깨-엉덩이 y차 or 기울기 등
    trunk = (sh.y - hip.y)
    return elbow_angle, trunk
```

---

### 6-3) 코어/체간

#### (11) seated_core_hold 앉아서 코어 버티기(홀드)
- **지표(예시)**: 어깨-엉덩이 라인의 기울기(중립 유지), 좌우 흔들림  
- **판정**: 목표 범위 내 유지시간 누적

```python
def metric_seated_core_hold(pose):
    L_sh, R_sh = pose.left_shoulder, pose.right_shoulder
    L_hip, R_hip = pose.left_hip, pose.right_hip
    if not is_visible(L_sh, R_sh, L_hip, R_hip):
        return None

    sh_x = (L_sh.x + R_sh.x) / 2.0
    hip_x = (L_hip.x + R_hip.x) / 2.0
    sway = abs(sh_x - hip_x)  # 좌우 흔들림(정면 기준)
    return sway
```

---

#### (12) standing_anti_extension_hold 서서 허리 버티기(홀드)
- **지표**: 어깨-엉덩이-무릎 정렬(과신전/과굴곡)  
- **판정**: 일정 범위 유지시간

---

#### (13) standing_arm_raise_core 코어 유지하며 팔 들기
- arm_raise 메트릭 + 체간 흔들림(sway/tilt)을 함께 체크  
- **점수화**: (팔 범위 달성 점수) - (체간 보상 페널티)

---

#### (14) bridge 브릿지
- **지표**: 힙 높이(어깨 대비), 좌우 골반 기울기(가능 시)  
- **판정**: 반복 또는 홀드

```python
def metric_bridge(pose):
    L_sh, R_sh = pose.left_shoulder, pose.right_shoulder
    L_hip, R_hip = pose.left_hip, pose.right_hip
    if not is_visible(L_sh, R_sh, L_hip, R_hip):
        return None

    shoulder_mid_y = (L_sh.y + R_sh.y) / 2.0
    hip_mid_y = (L_hip.y + R_hip.y) / 2.0

    lift = (shoulder_mid_y - hip_mid_y)  # 힙이 올라갈수록 증가하도록 정의
    pelvic_tilt = abs(L_hip.y - R_hip.y) # 좌우 골반 비대칭(옵션)
    return lift, pelvic_tilt
```

---

## 7. Hands(손) 운동 판정 로직

### 7-1) thumb_opposition 엄지-손가락 터치
```python
def metric_thumb_opposition(hand, finger_tip):
    scale = get_hand_scale(hand)
    d = norm_dist(hand.THUMB_TIP, finger_tip, scale)
    return d  # 작을수록 터치에 가까움
```
- **성공**: `d < 0.25` (초기값, 캘리브레이션 권장)

---

### 7-2) finger_spread 손가락 벌리기
```python
def metric_finger_spread(hand):
    scale = get_hand_scale(hand)
    d1 = norm_dist(hand.INDEX_TIP, hand.MIDDLE_TIP, scale)
    d2 = norm_dist(hand.MIDDLE_TIP, hand.RING_TIP, scale)
    d3 = norm_dist(hand.RING_TIP, hand.PINKY_TIP, scale)
    return (d1 + d2 + d3) / 3.0
```

---

### 7-3) finger_flexion 손가락 굽혔다 펴기 (상대 굴곡 지표)
> 실제 근력 측정이 아니라, **영상 기반 가동/수축 정도(0~1)** 를 추정합니다.

```python
def metric_finger_flexion_percent(hand, d_min, d_max):
    scale = get_hand_scale(hand)
    d = norm_dist(hand.MIDDLE_TIP, hand.MIDDLE_MCP, scale)

    # d가 작을수록 더 접힘 -> flex가 1에 가까워짐
    flex = clamp((d_max - d) / max(d_max - d_min, 1e-3), 0.0, 1.0)
    return flex
```

---

### 7-4) tendon_glide 힘줄 글라이딩(5 제스처)
- 접근 1: 규칙 기반(관절 각도 패턴)  
- 접근 2: 간단 분류기(특징=관절각/거리)로 5클래스 분류  
- MVP에서는 **규칙 기반 + “가장 비슷한 제스처” 매칭**이 구현 난이도가 낮습니다.

---

### 7-5) wrist_flexion 손목 굽힘/폄 (2D 근사)
- 웹캠 단일 시점에서는 손목 3D 회전이 어렵기 때문에:
  - **손등 방향 변화(landmark 상대 위치)** + **전완과 손의 2D 각도**로 근사
- 가능하면 “팔꿈치~손목(전완 벡터)”와 “손목~중지 MCP(손 벡터)”의 2D 각도를 사용

---

### 7-6) grip_squeeze 주먹 쥐기(상대 수축 지수)
- “실제 악력”이 아니라, **손가락 굴곡(접힘) 정도**로 정의  
- UI 문구 예: *“영상 기반 상대 수축 지수(0~100%)”*

---

### 7-7) pinch_hold 집게(핀치) 유지
```python
def metric_pinch_hold(hand):
    scale = get_hand_scale(hand)
    d = norm_dist(hand.THUMB_TIP, hand.INDEX_TIP, scale)
    return d
```
- **성공 유지**: `d < 0.20`을 N초 유지

---

### 7-8) finger_tap_sequence 손가락 순차 터치
- 순서 예: 엄지→검지→중지→약지→새끼  
- 각 단계는 `thumb_opposition` 거리로 성공/실패 판정  
- “정확도 우선(속도 제한)” 모드 추천

---

### 7-9) reach_and_touch 화면 목표 터치(상지+손 통합)
- Hands로 손끝 위치(예: INDEX_TIP) 추적  
- Pose로 상지 정렬/보상(몸통 기울기) 체크(옵션)  
- 목표 점(스크린 좌표)과 손끝 좌표의 정규화 거리로 성공 판정

---

## 8. 실서비스 팁(권장 설계)
- **초기 30초 캘리브레이션**: 각 운동의 “편안한 ROM”과 임계값 자동 설정
- **폼 점수화**: 범위 달성(ROM) + 정렬(보상 패널티) + 속도(너무 빠름 감점)
- **VRMAnimator**: Pose/Hands에서 얻은 관절을 아바타에 매핑(단, 오차가 보이므로 스무딩 필수)
