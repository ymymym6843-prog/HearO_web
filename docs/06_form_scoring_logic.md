# 폼 점수(Form Score) 산출 방식
> 목표: 사용자에게 **“잘했다/보완 필요”를 직관적으로 피드백**하면서  
> 임상적으로 의미 있는 정렬·범위·속도 요소를 반영

---

## 1. 폼 점수 구성(100점 만점)

| 구성 요소 | 비중 | 설명 |
|--------|----|----|
| 범위(ROM) | 40점 | 목표 가동범위 도달 |
| 정렬(Alignment) | 40점 | 보상동작 최소화 |
| 속도(Tempo) | 20점 | 너무 빠르거나 느리지 않음 |

---

## 2. 범위 점수(ROM Score, 0~40)

```python
rom_ratio = (current - down_th) / (up_th - down_th)
rom_ratio = clamp(rom_ratio, 0, 1)
ROM_score = rom_ratio * 40
```

- 목표 ROM 완전 달성 → 40점
- 절반만 도달 → 20점

---

## 3. 정렬 점수(Alignment Score, 0~40)

### 3-1. 보상동작 항목 예시
- 무릎 안쪽 붕괴(valgus)
- 상체 과기울기
- 어깨 들썩임
- 좌우 비대칭

```python
penalty = 0
if knee_valgus: penalty += 10
if trunk_tilt > limit: penalty += 10
if shoulder_shrug: penalty += 10
if asymmetry: penalty += 10

ALIGN_score = max(40 - penalty, 0)
```

---

## 4. 속도 점수(Tempo Score, 0~20)

| 조건 | 점수 |
|----|----|
| 목표 템포(예: 3초↑/3초↓) | 20 |
| 약간 빠름/느림 | 10~15 |
| 너무 빠름(반동) | 0~5 |

```python
tempo_error = abs(actual_time - target_time)
Tempo_score = max(20 - tempo_error * k, 0)
```

---

## 5. 최종 폼 점수

```python
FormScore = ROM_score + ALIGN_score + Tempo_score
```

### 현재 구현 (BaseDetector.calculateRepAccuracy)
실제 코드에서는 간소화된 공식 사용:
```python
progress = calculateProgress(angle)  # 0~1
formScore = min(1, actualROM / totalROM)
rawAccuracy = (progress * 0.7 + formScore * 0.3) * 100
# 동작 완료(progress >= 0.8) 시 최소 60% 보장
accuracy = max(60, min(100, rawAccuracy)) if progress >= 0.8 else min(100, rawAccuracy)
```

### UI 권장 피드백
- 85~100: 아주 좋음
- 70~84: 좋음(조금만 수정)
- 50~69: 주의(폼 교정 필요)
- <50: 재시도

---

## 6. 홀드(Hold) 운동 점수화
- 범위 대신 **유지시간 비율** 사용

```python
hold_ratio = actual_hold / target_hold
ROM_score = clamp(hold_ratio, 0, 1) * 40
```

---

## 7. 손 운동 점수화 보정
- 손은 속도 비중 ↓, 정확도 비중 ↑
- 권장 비중:
  - ROM/정확도 60
  - 정렬/안정성 30
  - 속도 10
