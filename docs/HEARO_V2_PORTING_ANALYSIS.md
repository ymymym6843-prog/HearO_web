# HearO-v2 기능 이식 종합 분석 보고서

**작성일**: 2026-01-24
**분석 대상**: HearO-v2 (React Native) → HearO_web (Next.js)
**참여 전문가**: Medical Expert, Chart Expert, DB Expert, UI Expert

---

## 1. 분석 요약 (Executive Summary)

### 1.1 분석 결과 요약

| 기능 | 이식 권장도 | 우선순위 | 예상 난이도 | 비고 |
|------|------------|----------|-------------|------|
| **ROM 측정 시스템** | ✅ 강력 권장 | 1순위 | 중 | 핵심 차별화 요소 |
| **안전 기능 (Red Flags)** | ✅ 강력 권장 | 1순위 | 하 | 의료 앱 필수 |
| **데이터 시각화** | ✅ 권장 | 2순위 | 중 | Recharts 사용 |
| **게이미피케이션** | ⚠️ 조건부 권장 | 3순위 | 중 | 단순화 필요 |
| **계정 분리** | ⚠️ 조건부 권장 | 2순위 | 상 | MVP 이후 |
| **의료진 대시보드** | ❌ 보류 | 4순위 | 상 | Phase 3 이후 |
| **처방 시스템** | ❌ 보류 | - | 상 | 필요시 추가 |

### 1.2 핵심 권장사항

1. **2단계 재활 시스템**: 4단계 → 2단계로 단순화 (RECOVERY / STRENGTH)
2. **안전 우선**: Red Flags 기능 최우선 구현 (VAS 7+ 통증, ROM 이상 등)
3. **시각화 라이브러리**: Recharts 채택 (번들 크기 작음, Next.js 호환)
4. **점진적 마이그레이션**: 3개 Phase로 나누어 안전하게 진행

---

## 2. 전문가 분석 결과

### 2.1 Medical Expert (재활의학 전문가) 분석

#### A. 재활 단계 단순화 권장

**HearO-v2 (4단계)**
```
Phase 1: Acute (0-2주) - ROM 0-30%
Phase 2: Subacute (2-6주) - ROM 30-60%
Phase 3: Remodeling (6-12주) - ROM 60-90%
Phase 4: Return to Activity (12주+) - ROM 90%+
```

**HearO_web 권장 (2단계)**
```
RECOVERY: ROM 0-70% (보호적 운동, 제한된 운동 범위)
STRENGTH: ROM 70%+ (근력 강화, 정상 활동)
```

**근거**: 웹 기반 자가 관리에서는 복잡한 4단계보다 직관적인 2단계가 사용자 이해도와 순응도를 높임

#### B. 필수 안전 기능 (Red Flags)

| Red Flag | 기준 | 대응 |
|----------|------|------|
| 심한 통증 | VAS ≥ 7/10 | 즉시 중단, 의료진 상담 권고 |
| 과도한 ROM | > 120% of normal | 보상 동작 경고 |
| 좌우 비대칭 | > 30° difference | 환측 확인 권고 |
| 급격한 ROM 감소 | 이전 대비 20%↓ | 염증/부종 확인 |

#### C. MediaPipe ROM 측정 정확도

- **정확도**: 2-5° 오차 (임상적으로 허용 가능)
- **worldLandmarks 3D 좌표 사용 필수**: 평면 좌표(x,y)만 사용 시 투영 왜곡 발생
- **신뢰도 기준**: confidence ≥ 0.7 이상 데이터만 유효 처리

#### D. 필수 vs 선택 기능

**필수 구현**
- [x] 기본 ROM 측정 (무릎, 어깨)
- [x] 통증 모니터링 (VAS 스케일)
- [x] 안전 범위 경고
- [x] 운동 중단 조건

**선택 구현 (Phase 2)**
- [ ] 캘리브레이션 (개인별 기준 설정)
- [ ] 보상 동작 감지
- [ ] 운동 처방 연동

---

### 2.2 Chart Expert (시각화 전문가) 분석

#### A. 라이브러리 선택: Recharts

| 라이브러리 | 번들 크기 | Next.js 호환 | 학습 곡선 | 권장도 |
|-----------|----------|-------------|----------|--------|
| **Recharts** | ~250KB | ✅ | 낮음 | ✅ 권장 |
| Victory | ~350KB | ✅ | 중간 | ⚠️ |
| Chart.js | ~180KB | ⚠️ canvas | 중간 | - |
| D3.js | ~300KB | ✅ | 높음 | - |

**선택 근거**: React 기반, 선언적 API, 충분한 커스터마이징, SSR 지원

#### B. 구현 우선순위

**1순위: ROM Gauge (즉시 구현)**
- 현재 ROM 각도를 반원형 게이지로 표시
- 정상 범위, 현재 값, 목표 값 시각화
- 실시간 업데이트 필요

**2순위: Daily Summary (1주 내)**
- 일별 운동 완료율
- 평균 정확도
- 통증 레벨 추이

**3순위: ROM Trend Chart (2주 내)**
- 30일 ROM 변화 추이
- 좌우 비교 그래프
- 목표 대비 진행률

#### C. 구현 예시: ROM Gauge

```tsx
// components/charts/ROMGauge.tsx
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

interface ROMGaugeProps {
  currentAngle: number;
  targetAngle: number;
  normalRange: { min: number; max: number };
  jointType: string;
}

export function ROMGauge({
  currentAngle,
  targetAngle,
  normalRange,
  jointType
}: ROMGaugeProps) {
  const percentage = Math.min(100, (currentAngle / targetAngle) * 100);
  const isNormal = currentAngle >= normalRange.min && currentAngle <= normalRange.max;

  const data = [
    { value: percentage, color: isNormal ? '#22c55e' : '#f97316' },
    { value: 100 - percentage, color: '#e5e7eb' }
  ];

  return (
    <div className="w-48 h-32">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            startAngle={180}
            endAngle={0}
            innerRadius="60%"
            outerRadius="100%"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
            <Label
              value={`${currentAngle}°`}
              position="center"
              className="text-2xl font-bold"
            />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-sm text-gray-600">
        {jointType} ROM
      </p>
    </div>
  );
}
```

#### D. 성능 최적화 전략

```tsx
// 1. Dynamic Import (코드 스플리팅)
const ROMGauge = dynamic(() => import('@/components/charts/ROMGauge'), {
  ssr: false,
  loading: () => <GaugeSkeleton />
});

// 2. 데이터 샘플링 (30일 데이터 → 7개 포인트)
function sampleData(data: ROMData[], points: number): ROMData[] {
  const interval = Math.ceil(data.length / points);
  return data.filter((_, i) => i % interval === 0);
}

// 3. 메모이제이션
const memoizedData = useMemo(() =>
  processChartData(rawData), [rawData]
);
```

---

### 2.3 DB Expert (데이터베이스 전문가) 분석

#### A. 스키마 마이그레이션 전략

**Phase 1: 의료 코어 (1-2주)**
```sql
-- 003_medical_core.sql
1. profiles 테이블 확장 (user_type, level, xp)
2. patients 테이블 생성
3. clinician_patient_relationships 테이블 생성
4. rom_measurements 테이블 생성
5. pain_events 테이블 생성
```

**Phase 2: 게이미피케이션 (1주)**
```sql
-- 004_gamification.sql
1. achievements 테이블 생성
2. daily_stats 테이블 생성
```

**Phase 3: 고급 기능 (필요시)**
```sql
-- 005_advanced_features.sql
1. clinician_prescriptions 테이블 (보류)
2. story_progress 테이블 (보류)
```

#### B. RLS (Row Level Security) 정책

**핵심 원칙**
1. 환자 데이터 격리: 본인 데이터만 접근
2. 의료진 제한적 접근: 담당 환자 데이터만 조회 (수정 불가)
3. 익명화: 공개 데이터는 개인정보 제거

```sql
-- 환자 본인 데이터 접근
CREATE POLICY "patients_own_data" ON patients
  FOR ALL USING (auth.uid() = user_id);

-- 의료진은 담당 환자 데이터 조회만 가능
CREATE POLICY "patients_clinician_view" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clinician_patient_relationships
      WHERE clinician_id = auth.uid()
      AND patient_id = patients.id
      AND status = 'active'
    )
  );
```

#### C. 생성된 파일

| 파일 | 설명 |
|------|------|
| `supabase/migrations/003_medical_core.sql` | 의료 코어 마이그레이션 |
| `supabase/migrations/003_medical_core_rollback.sql` | 롤백 스크립트 |
| `src/types/medical.ts` | TypeScript 타입 정의 |
| `docs/database_migration_review.md` | 상세 마이그레이션 가이드 |
| `docs/migration_guide.md` | 단계별 실행 가이드 |

---

### 2.4 UI Expert (인터페이스 전문가) 분석

#### A. 컴포넌트 구현 우선순위

| 순위 | 컴포넌트 | 목적 | 난이도 |
|------|----------|------|--------|
| 1 | ROMGauge | 실시간 ROM 시각화 | 중 |
| 2 | PainScaleInput | 통증 레벨 입력 | 하 |
| 3 | XPPopup | 경험치 획득 알림 | 하 |
| 4 | ComboCounter | 연속 운동 카운터 | 하 |
| 5 | AchievementToast | 업적 달성 알림 | 중 |
| 6 | DailySummaryCard | 일일 운동 요약 | 중 |
| 7 | ROMTrendChart | ROM 추이 그래프 | 중 |

#### B. 반응형 디자인 전략

```tsx
// 모바일 우선 디자인
<div className="
  grid
  grid-cols-1       /* 모바일: 1열 */
  md:grid-cols-2    /* 태블릿: 2열 */
  lg:grid-cols-3    /* 데스크탑: 3열 */
  gap-4
">
  <ROMGauge />
  <DailySummaryCard />
  <AchievementList />
</div>
```

#### C. 접근성 체크리스트

- [ ] 모든 차트에 `aria-label` 추가
- [ ] 색상 대비 4.5:1 이상 유지
- [ ] 키보드 네비게이션 지원
- [ ] 스크린 리더 호환 (데이터 테이블 대안 제공)
- [ ] `prefers-reduced-motion` 지원

---

## 3. 구현 로드맵

### Phase 1: 의료 코어 (2주)

**Week 1**
- [ ] 데이터베이스 마이그레이션 (`003_medical_core.sql`)
- [ ] TypeScript 타입 정의 적용
- [ ] RLS 정책 테스트
- [ ] ROM 측정 서비스 구현

**Week 2**
- [ ] ROMGauge 컴포넌트 구현
- [ ] 통증 모니터링 UI
- [ ] Red Flags 안전 기능
- [ ] 2단계 재활 시스템 적용

### Phase 2: 시각화 & 게이미피케이션 (2주)

**Week 3**
- [ ] Recharts 설치 및 설정
- [ ] DailySummaryCard 구현
- [ ] ROMTrendChart 구현
- [ ] 게이미피케이션 스키마 마이그레이션

**Week 4**
- [ ] XP/레벨 시스템 구현
- [ ] 업적 시스템 (20개 중 핵심 10개)
- [ ] 콤보 카운터
- [ ] 일일 통계 대시보드

### Phase 3: 사용자 테스트 & 최적화 (1주)

**Week 5**
- [ ] 성능 최적화 (코드 스플리팅)
- [ ] 접근성 감사
- [ ] 사용자 피드백 수렴
- [ ] 버그 수정

---

## 4. 기술 스택 추가 사항

### 4.1 새로운 의존성

```json
{
  "dependencies": {
    "recharts": "^2.12.0"
  }
}
```

### 4.2 파일 구조 변경

```
src/
├── components/
│   ├── charts/            # [NEW] 차트 컴포넌트
│   │   ├── ROMGauge.tsx
│   │   ├── ROMTrendChart.tsx
│   │   └── DailySummaryChart.tsx
│   ├── medical/           # [NEW] 의료 관련 컴포넌트
│   │   ├── PainScaleInput.tsx
│   │   └── RedFlagAlert.tsx
│   └── gamification/      # [NEW] 게이미피케이션
│       ├── XPPopup.tsx
│       ├── ComboCounter.tsx
│       └── AchievementToast.tsx
├── services/
│   ├── medical/           # [NEW] 의료 서비스
│   │   ├── romService.ts
│   │   ├── painService.ts
│   │   └── safetyService.ts
│   └── gamification/      # [NEW] 게이미피케이션 서비스
│       ├── achievementService.ts
│       └── xpService.ts
├── types/
│   └── medical.ts         # [CREATED] 의료 타입 정의
└── hooks/
    ├── useROM.ts          # [NEW] ROM 측정 훅
    └── useAchievements.ts # [NEW] 업적 훅
```

---

## 5. 이식하지 않을 기능

### 5.1 보류 기능

| 기능 | 보류 이유 | 대안 |
|------|----------|------|
| 의료진 대시보드 | 복잡성 높음, 사용자 수요 불확실 | 간단한 공유 리포트 |
| 친구 시스템 | MVP 범위 초과 | Phase 4 검토 |
| 푸시 알림 | 웹앱 PWA 우선 필요 | 브라우저 알림 |
| 비디오 녹화 | 저장/전송 비용 높음 | 스크린샷 캡처 |
| AI 운동 추천 | 복잡성 높음 | 고정 운동 프로그램 |

### 5.2 단순화 기능

| 원본 기능 | 단순화 방안 |
|----------|------------|
| 4단계 재활 시스템 | 2단계로 단순화 (RECOVERY/STRENGTH) |
| 20+ 업적 | 핵심 10개로 축소 |
| 복잡한 캘리브레이션 | 기본 캘리브레이션만 |
| 상세 리포트 내보내기 | 텍스트 요약 + 스크린샷 |

---

## 6. 리스크 관리

### 6.1 기술적 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| 마이그레이션 데이터 손실 | 높음 | 백업 필수, 롤백 스크립트 준비 |
| 차트 성능 저하 | 중간 | 코드 스플리팅, 데이터 샘플링 |
| MediaPipe 정확도 | 중간 | confidence 필터링, 이상치 제거 |

### 6.2 비즈니스 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| 사용자 혼란 | 중간 | 온보딩 튜토리얼, 점진적 기능 출시 |
| 기능 과부하 | 낮음 | MVP 우선, 피드백 기반 확장 |

---

## 7. 성공 지표

### 7.1 기술 지표

- 차트 렌더링 시간: < 500ms
- ROM 측정 정확도: ±5° 이내
- 페이지 로드 시간: < 3초 (LCP)
- TypeScript 에러: 0

### 7.2 비즈니스 지표

- ROM 측정 완료율: > 70%
- 일일 활성 사용자: > 100명 (1개월 후)
- 업적 달성률: 평균 5개+ (1주 사용 후)
- 사용자 만족도: > 4.0/5.0

---

## 8. 결론

### 8.1 즉시 시작할 작업

1. **Recharts 설치**: `npm install recharts`
2. **데이터베이스 마이그레이션**: `003_medical_core.sql` 적용
3. **ROMGauge 컴포넌트 구현**: 핵심 시각화 요소
4. **안전 기능 구현**: Red Flags 알림 시스템

### 8.2 사용자 승인 필요 사항

다음 사항에 대한 확인이 필요합니다:

1. **2단계 재활 시스템 단순화**: 4단계 → 2단계 전환 동의 여부
2. **업적 개수 축소**: 20개 → 10개로 축소 동의 여부
3. **의료진 대시보드 보류**: Phase 3 이후로 연기 동의 여부
4. **마이그레이션 일정**: Phase 1부터 순차 진행 동의 여부

### 8.3 최종 권고

전문가 분석 결과, HearO-v2의 핵심 기능들은 **단순화 및 최적화를 거쳐** HearO_web에 성공적으로 이식 가능합니다. 특히:

- **ROM 측정 시스템**: MediaPipe 기반으로 충분히 정확하며, 웹 환경에서도 실시간 처리 가능
- **데이터 시각화**: Recharts를 통해 가볍고 반응형인 차트 구현 가능
- **게이미피케이션**: 핵심 요소만 추출하여 사용자 참여도 향상 가능

**무작정 전체 이식이 아닌, 웹 환경에 최적화된 형태로 점진적 적용을 권장합니다.**

---

*분석 완료: 2026-01-24*
*다음 단계: 사용자 승인 후 Phase 1 구현 시작*
