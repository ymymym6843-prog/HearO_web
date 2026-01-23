# HearO-v2 데이터베이스 구조를 HearO_web에 적용하기 위한 검토 보고서

**작성일**: 2026-01-24
**목적**: HearO-v2의 풍부한 의료 데이터 구조를 HearO_web에 안전하게 통합

---

## 1. 현재 상태 분석

### 1.1 HearO_web 현재 스키마 (간소화된 MVP)

**테이블 구조**:
- `profiles` - 기본 사용자 프로필 (worldview 선호도)
- `exercise_sessions` - 운동 세션 기록
- `exercise_reps` - 개별 반복 기록
- `calibrations` - 캘리브레이션 데이터
- `user_settings` - 사용자 설정
- `pain_records` - 통증 기록 (최근 추가)

**특징**:
- 단일 사용자 타입 (환자만)
- 의료진 기능 없음
- ROM 측정 없음
- 게이미피케이션 미구현

### 1.2 HearO-v2 스키마 (완전한 재활 시스템)

**핵심 테이블** (13개 + 추가 마이그레이션):
1. `profiles` - 사용자 프로필 (user_type: patient/clinician, 게임 데이터)
2. `patients` - 환자 의료 정보
3. `clinician_patient_relationships` - 의료진-환자 관계
4. `clinician_prescriptions` - 의료진 처방
5. `exercise_sessions` - 운동 세션
6. `exercise_results` - 운동 결과
7. `rom_measurements` - ROM 측정
8. `rom_sessions` - ROM 측정 세션
9. `pain_events` - 통증 이벤트
10. `episodes` - 스토리 에피소드
11. `story_progress` - 스토리 진행
12. `achievements` - 업적
13. `daily_stats` - 일일 통계

**추가 시스템**:
- 게이미피케이션 (achievements, daily_challenges_completed, user_game_stats)
- 친구 시스템
- 푸시 알림
- API 쿼터
- 비디오 녹화
- 익명화 시스템

---

## 2. 스키마 설계 권장사항

### 2.1 필수 통합 테이블 (Phase 1 - 의료 기능 MVP)

#### A. 사용자 타입 확장
```sql
-- profiles 테이블 확장
ALTER TABLE profiles ADD COLUMN user_type TEXT
  CHECK (user_type IN ('patient', 'clinician', 'general'))
  DEFAULT 'patient';
ALTER TABLE profiles ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN total_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN current_streak INTEGER DEFAULT 0;

-- 임상의사 전용 컬럼 (선택적)
ALTER TABLE profiles ADD COLUMN license_number TEXT;
ALTER TABLE profiles ADD COLUMN hospital TEXT;
ALTER TABLE profiles ADD COLUMN specialization TEXT;
```

**이점**: 기존 테이블 확장으로 마이그레이션 단순화

#### B. 환자 의료 정보
```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  condition TEXT,
  rehabilitation_mode TEXT CHECK (rehabilitation_mode IN ('knee', 'shoulder', 'back', 'hip')),
  current_phase INTEGER DEFAULT 1 CHECK (current_phase BETWEEN 1 AND 5),
  eligibility_checked BOOLEAN DEFAULT FALSE,
  eligibility_passed BOOLEAN,
  contraindications JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_rehabilitation_mode ON patients(rehabilitation_mode);
```

**이점**: 환자별 재활 모드 및 단계 관리

#### C. 의료진-환자 관계
```sql
CREATE TABLE clinician_patient_relationships (
  clinician_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (clinician_id, patient_id)
);

CREATE INDEX idx_cpr_clinician ON clinician_patient_relationships(clinician_id);
CREATE INDEX idx_cpr_patient ON clinician_patient_relationships(patient_id);
```

**이점**: N:N 관계로 한 환자가 여러 의료진에게 관리 가능

#### D. ROM 측정 시스템
```sql
CREATE TABLE rom_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES exercise_sessions(id) ON DELETE SET NULL,
  joint_type TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  angle NUMERIC NOT NULL,
  affected_side TEXT CHECK (affected_side IN ('left', 'right', 'bilateral')),
  measurement_type TEXT CHECK (measurement_type IN ('active', 'passive')),
  confidence NUMERIC,
  is_valid BOOLEAN DEFAULT TRUE,
  compensation_detected BOOLEAN DEFAULT FALSE,
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rom_patient_id ON rom_measurements(patient_id);
CREATE INDEX idx_rom_joint_type ON rom_measurements(joint_type);
CREATE INDEX idx_rom_measured_at ON rom_measurements(measured_at DESC);
```

**이점**:
- 의학적으로 표준화된 ROM 데이터
- 좌우 비교 및 보상 동작 감지
- 신뢰도 기반 필터링

#### E. exercise_sessions 확장
```sql
-- 기존 테이블에 컬럼 추가
ALTER TABLE exercise_sessions
  ADD COLUMN patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  ADD COLUMN program_type TEXT CHECK (program_type IN ('rehab', 'fitness')),
  ADD COLUMN completion_status TEXT
    CHECK (completion_status IN ('completed', 'pain_stop', 'user_stop', 'error', 'in_progress'))
    DEFAULT 'in_progress',
  ADD COLUMN thermal_events INTEGER DEFAULT 0;

-- 기존 status 컬럼은 completion_status로 통합
```

### 2.2 선택적 통합 테이블 (Phase 2 - 게이미피케이션)

#### A. 업적 시스템
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER DEFAULT 0,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_achievements_earned_at ON achievements(earned_at DESC);
```

#### B. 일일 통계
```sql
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  exercises_completed INTEGER DEFAULT 0,
  total_reps INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  average_accuracy NUMERIC,
  average_pain_level NUMERIC,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date DESC);
```

### 2.3 보류 테이블 (Phase 3 이후)

다음 기능들은 웹 MVP에서 필수가 아니므로 나중에 추가:
- `clinician_prescriptions` - 처방 시스템 (의료진 대시보드 구현 시)
- `rom_sessions` - ROM 전용 세션 (일반 exercise_sessions에 통합 가능)
- `story_progress` - 스토리 진행 (episodes에 통합 가능)
- `user_game_stats` - 게임 통계 (profiles에 통합됨)
- 친구 시스템, 푸시 알림, API 쿼터 등

---

## 3. 마이그레이션 전략

### 3.1 단계별 마이그레이션 (안전한 롤아웃)

#### Phase 1: 의료 코어 기능 (1-2주)
```sql
-- 003_medical_core.sql
1. profiles 테이블 확장 (user_type, level, xp)
2. patients 테이블 생성
3. clinician_patient_relationships 테이블 생성
4. rom_measurements 테이블 생성
5. exercise_sessions 확장 (patient_id, program_type)
6. pain_records -> pain_events 통합 (선택적)
```

**마이그레이션 체크리스트**:
- [ ] 기존 users는 모두 user_type='patient'로 기본값 설정
- [ ] 기존 exercise_sessions에 patient_id 자동 생성 (user_id 기반)
- [ ] 기존 데이터 무결성 검증

#### Phase 2: 게이미피케이션 (1주)
```sql
-- 004_gamification.sql
1. achievements 테이블 생성
2. daily_stats 테이블 생성
3. profiles에 게임 관련 컬럼 추가 (current_streak, longest_streak)
```

#### Phase 3: 고급 기능 (필요시)
```sql
-- 005_advanced_features.sql
1. clinician_prescriptions 테이블 생성
2. story_progress 테이블 생성
3. 리더보드 뷰 생성
```

### 3.2 데이터 호환성 전략

#### A. 역방향 호환성 유지
```sql
-- 기존 쿼리가 깨지지 않도록 기본값 설정
ALTER TABLE profiles
  ADD COLUMN user_type TEXT DEFAULT 'patient';

-- 기존 exercise_reps는 그대로 유지 (exercise_results와 병행)
```

#### B. 점진적 전환
```typescript
// TypeScript 타입 정의 - 단계적 마이그레이션
interface Profile {
  id: string;
  username?: string;
  full_name?: string;

  // Phase 1에서 추가
  user_type?: 'patient' | 'clinician' | 'general';
  level?: number;
  total_xp?: number;

  // Phase 2에서 추가
  current_streak?: number;
  longest_streak?: number;
}
```

### 3.3 롤백 계획

각 마이그레이션에 대응하는 롤백 SQL 작성:

```sql
-- 003_medical_core_rollback.sql
ALTER TABLE profiles
  DROP COLUMN IF EXISTS user_type,
  DROP COLUMN IF EXISTS level,
  DROP COLUMN IF EXISTS total_xp;

DROP TABLE IF EXISTS rom_measurements CASCADE;
DROP TABLE IF EXISTS clinician_patient_relationships CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
```

---

## 4. RLS 정책 설계

### 4.1 핵심 보안 원칙

1. **환자 데이터 격리**: 환자는 자신의 데이터만 접근
2. **의료진 제한적 접근**: 담당 환자의 데이터만 조회 가능 (수정 불가)
3. **익명화**: 리더보드 등 공개 데이터는 개인정보 제거

### 4.2 RLS 정책 구현

#### A. profiles 테이블
```sql
-- 사용자는 자신의 프로필만 관리
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 의료진은 담당 환자의 프로필 조회 가능
CREATE POLICY "profiles_clinician_view_patients" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clinician_patient_relationships cpr
      JOIN patients p ON p.id = cpr.patient_id
      WHERE cpr.clinician_id = auth.uid()
      AND p.user_id = profiles.id
      AND cpr.status = 'active'
    )
  );
```

#### B. patients 테이블
```sql
-- 환자는 자신의 의료 정보 관리
CREATE POLICY "patients_own_data" ON patients
  FOR ALL USING (auth.uid() = user_id);

-- 의료진은 담당 환자 정보 조회만 가능 (수정 불가)
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

#### C. rom_measurements 테이블
```sql
-- 환자는 자신의 ROM 데이터 관리
CREATE POLICY "rom_patient_own" ON rom_measurements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = rom_measurements.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- 의료진은 담당 환자 ROM 조회만 가능
CREATE POLICY "rom_clinician_view" ON rom_measurements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clinician_patient_relationships
      WHERE clinician_id = auth.uid()
      AND patient_id = rom_measurements.patient_id
      AND status = 'active'
    )
  );
```

#### D. exercise_sessions 테이블
```sql
-- 사용자는 자신의 세션 관리
CREATE POLICY "sessions_own" ON exercise_sessions
  FOR ALL USING (user_id = auth.uid());

-- 의료진은 담당 환자 세션 조회
CREATE POLICY "sessions_clinician_view" ON exercise_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clinician_patient_relationships cpr
      JOIN patients p ON p.id = cpr.patient_id
      WHERE cpr.clinician_id = auth.uid()
      AND p.user_id = exercise_sessions.user_id
      AND cpr.status = 'active'
    )
  );
```

### 4.3 성능 최적화 인덱스

RLS 정책의 EXISTS 서브쿼리 성능 향상:

```sql
-- clinician_patient_relationships 조회 최적화
CREATE INDEX idx_cpr_clinician_status
  ON clinician_patient_relationships(clinician_id, status)
  WHERE status = 'active';

-- patients의 user_id 조회 최적화
CREATE INDEX idx_patients_user_id ON patients(user_id);

-- 복합 조회 최적화
CREATE INDEX idx_rom_patient_measured
  ON rom_measurements(patient_id, measured_at DESC);
```

---

## 5. 성능 최적화 전략

### 5.1 인덱싱 전략

#### A. 조회 패턴 기반 인덱스

**환자 대시보드 쿼리**:
```sql
-- 최근 운동 세션 조회 (user_id + 시간순)
CREATE INDEX idx_sessions_user_started
  ON exercise_sessions(user_id, started_at DESC);

-- 특정 관절의 ROM 추이 (patient_id + joint_type + 시간순)
CREATE INDEX idx_rom_patient_joint_time
  ON rom_measurements(patient_id, joint_type, measured_at DESC);

-- 일일 통계 조회 (user_id + 날짜순)
CREATE INDEX idx_daily_stats_user_date
  ON daily_stats(user_id, date DESC);
```

**의료진 대시보드 쿼리**:
```sql
-- 담당 환자 목록 + 최근 활동
CREATE INDEX idx_sessions_patient_started
  ON exercise_sessions(patient_id, started_at DESC)
  WHERE patient_id IS NOT NULL;

-- 통증 이벤트 모니터링
CREATE INDEX idx_pain_patient_level_time
  ON pain_events(patient_id, pain_level, created_at DESC)
  WHERE pain_level >= 2;
```

#### B. 파티셔닝 (대규모 데이터 대비)

시간 기반 데이터 파티셔닝 (1천만 건 이상 예상 시):
```sql
-- exercise_sessions을 월별 파티셔닝
CREATE TABLE exercise_sessions_2026_01
  PARTITION OF exercise_sessions
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- 자동 파티션 생성 함수
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
-- 파티션 자동 생성 로직
$$ LANGUAGE plpgsql;
```

### 5.2 쿼리 최적화

#### A. Materialized View (집계 쿼리 가속)

```sql
-- 의료진별 환자 요약 뷰
CREATE MATERIALIZED VIEW clinician_patient_summary AS
SELECT
  cpr.clinician_id,
  cpr.patient_id,
  p.rehabilitation_mode,
  COUNT(DISTINCT es.id) as total_sessions,
  AVG(es.average_accuracy) as avg_accuracy,
  MAX(es.started_at) as last_session,
  COUNT(pe.id) FILTER (WHERE pe.pain_level >= 2) as high_pain_events
FROM clinician_patient_relationships cpr
JOIN patients p ON p.id = cpr.patient_id
LEFT JOIN exercise_sessions es ON es.patient_id = p.id
LEFT JOIN pain_events pe ON pe.patient_id = p.id
WHERE cpr.status = 'active'
GROUP BY cpr.clinician_id, cpr.patient_id, p.rehabilitation_mode;

-- 인덱스 생성
CREATE INDEX idx_cps_clinician ON clinician_patient_summary(clinician_id);

-- 일일 갱신 (크론 작업)
REFRESH MATERIALIZED VIEW CONCURRENTLY clinician_patient_summary;
```

#### B. 함수 기반 인덱스

```sql
-- 특정 날짜 범위 쿼리 최적화
CREATE INDEX idx_sessions_date_range
  ON exercise_sessions(user_id, (started_at::date));

-- JSONB 컬럼 인덱싱
CREATE INDEX idx_prescriptions_allowed_exercises
  ON clinician_prescriptions USING GIN (allowed_exercises);
```

### 5.3 Connection Pooling 설정

```typescript
// Supabase 클라이언트 최적화
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: { 'x-application-name': 'hearo-web' },
  },
  // Connection pooling
  pooler: {
    mode: 'transaction', // 트랜잭션 풀링 모드
  },
});
```

---

## 6. 단순화 방안 (웹 MVP 우선순위)

### 6.1 필수 테이블 (Phase 1 - 2주 내 구현)

#### 우선순위 1: 의료 코어
1. `profiles` 확장 (user_type, level, xp)
2. `patients` (환자 의료 정보)
3. `clinician_patient_relationships` (의료진 연결)
4. `rom_measurements` (ROM 측정 핵심)
5. `exercise_sessions` 확장

**구현 범위**: 환자 운동 + 의료진 모니터링 기본 기능

### 6.2 선택 테이블 (Phase 2 - 필요시)

#### 우선순위 2: 사용자 참여도 향상
1. `achievements` (업적)
2. `daily_stats` (일일 통계)

**구현 범위**: 게이미피케이션 기본 기능

### 6.3 보류 테이블 (Phase 3 이후)

다음 기능들은 사용자 피드백 수집 후 결정:
- `clinician_prescriptions` - 의료진 대시보드 고도화 시
- `rom_sessions` - ROM 전용 측정 도구 개발 시
- `story_progress` - 스토리 분기 시스템 구현 시
- `daily_challenges_completed` - 챌린지 시스템 구현 시
- `user_game_stats` - 리더보드 시스템 구현 시
- 친구 시스템
- 푸시 알림
- API 쿼터 시스템

### 6.4 테이블 통합 권장사항

#### A. pain_records vs pain_events 통합
현재 HearO_web의 `pain_records`를 HearO-v2의 `pain_events` 구조로 전환:

**변경 사항**:
```sql
-- pain_records (HearO_web)
pain_level INTEGER CHECK (1-5)  -- 5단계
timing TEXT (before/during/after)

-- pain_events (HearO-v2)
pain_level INTEGER CHECK (0-3)  -- 4단계 (0=없음, 3=심각)
patient_id UUID  -- patients 테이블 연결
clinician_notified BOOLEAN  -- 의료진 알림 여부
```

**마이그레이션**:
```sql
-- 1. pain_events 테이블 생성
CREATE TABLE pain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES exercise_sessions(id) ON DELETE SET NULL,
  pain_level INTEGER NOT NULL CHECK (pain_level BETWEEN 0 AND 3),
  exercise_id TEXT,
  body_part TEXT,
  notes TEXT,
  clinician_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 기존 데이터 변환 (1-5 -> 0-3)
INSERT INTO pain_events (patient_id, session_id, pain_level, body_part, notes, created_at)
SELECT
  p.id as patient_id,
  pr.session_id,
  CASE
    WHEN pr.pain_level <= 2 THEN 1
    WHEN pr.pain_level = 3 THEN 2
    ELSE 3
  END as pain_level,
  pr.body_part,
  CONCAT_WS(' | ', pr.pain_type, pr.timing, pr.notes) as notes,
  pr.timestamp
FROM pain_records pr
JOIN profiles prof ON prof.id = pr.user_id
JOIN patients p ON p.user_id = prof.id;

-- 3. pain_records 테이블 제거 (데이터 확인 후)
DROP TABLE pain_records;
```

#### B. exercise_reps vs exercise_results 병행
- `exercise_reps`: 반복(rep) 단위 상세 기록 유지
- `exercise_results`: 운동 종목별 요약 추가

**장점**:
- 상세 데이터 + 요약 데이터 동시 제공
- 쿼리 성능 향상 (대부분의 조회는 요약 데이터 사용)

---

## 7. 구현 로드맵

### Week 1-2: Phase 1 - 의료 코어 마이그레이션

**Day 1-3: 스키마 마이그레이션**
- [ ] `003_medical_core.sql` 작성
- [ ] 로컬 Supabase에서 테스트
- [ ] 기존 데이터 마이그레이션 스크립트 작성

**Day 4-7: 백엔드 통합**
```typescript
// 새 타입 정의
interface Patient {
  id: string;
  user_id: string;
  rehabilitation_mode: 'knee' | 'shoulder' | 'back' | 'hip';
  current_phase: number;
}

interface ROMMeasurement {
  id: string;
  patient_id: string;
  joint_type: string;
  movement_type: string;
  angle: number;
  affected_side: 'left' | 'right' | 'bilateral';
}

// Supabase 클라이언트 확장
const { data: romData } = await supabase
  .from('rom_measurements')
  .select('*')
  .eq('patient_id', patientId)
  .order('measured_at', { ascending: false })
  .limit(10);
```

**Day 8-10: RLS 정책 적용 및 테스트**
- [ ] 모든 RLS 정책 배포
- [ ] 환자/의료진 시나리오 테스트
- [ ] 권한 누락 확인

**Day 11-14: 프론트엔드 통합**
- [ ] ROM 측정 UI 컴포넌트
- [ ] 의료진 대시보드 기본 레이아웃
- [ ] 환자-의료진 연결 UI

### Week 3: Phase 2 - 게이미피케이션 (선택)

**Day 1-3: 게이미피케이션 스키마**
- [ ] `004_gamification.sql` 배포
- [ ] 업적 정의 JSON 작성
- [ ] XP 계산 로직 구현

**Day 4-7: 프론트엔드 구현**
- [ ] 업적 팝업 UI
- [ ] 레벨 진행 바
- [ ] 일일 통계 대시보드

### Week 4: 테스트 및 최적화

**Day 1-3: 부하 테스트**
- [ ] 쿼리 성능 측정 (EXPLAIN ANALYZE)
- [ ] 인덱스 최적화
- [ ] N+1 쿼리 제거

**Day 4-7: 보안 감사**
- [ ] RLS 정책 침투 테스트
- [ ] SQL 인젝션 검사
- [ ] 민감 데이터 암호화 확인

---

## 8. 리스크 관리

### 8.1 기술적 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| 기존 데이터 손실 | 높음 | 마이그레이션 전 백업, 롤백 스크립트 준비 |
| RLS 권한 오류 | 중간 | 철저한 시나리오 테스트, 단계적 배포 |
| 쿼리 성능 저하 | 중간 | 인덱스 최적화, 쿼리 프로파일링 |
| 스키마 충돌 | 낮음 | 네이밍 컨벤션 통일, 컬럼 별칭 사용 |

### 8.2 비즈니스 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| 개발 지연 | 중간 | Phase별 마일스톤 설정, MVP 우선 |
| 사용자 혼란 | 낮음 | 점진적 기능 출시, 튜토리얼 제공 |
| 의료진 미사용 | 중간 | 초기 파일럿 그룹 모집, 피드백 수렴 |

### 8.3 규제 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| 의료 데이터 규제 | 높음 | 법률 자문, 데이터 익명화 철저 |
| 개인정보 보호법 | 높음 | GDPR/PIPA 준수, 동의 프로세스 구현 |

---

## 9. 성공 지표 (KPI)

### 9.1 기술적 지표

- **쿼리 응답 시간**: 95%ile < 200ms
- **RLS 정책 커버리지**: 100% (모든 테이블)
- **인덱스 히트율**: > 95%
- **다운타임**: < 1시간 (마이그레이션 시)

### 9.2 비즈니스 지표

- **의료진 가입률**: 월 10명 이상
- **환자-의료진 연결률**: 30% 이상
- **ROM 측정 완료율**: 주 1회 이상 (환자당)
- **데이터 정확도**: ROM 측정 신뢰도 > 0.8

---

## 10. 결론 및 권장사항

### 10.1 즉시 시작 가능한 작업 (Week 1)

1. **`003_medical_core.sql` 마이그레이션 파일 작성**
   - profiles 확장
   - patients, clinician_patient_relationships, rom_measurements 생성
   - 기존 데이터 무결성 검증

2. **RLS 정책 우선 적용**
   - 의료 데이터 보안이 최우선
   - 단계적 테스트 필수

3. **ROM 측정 UI 프로토타입**
   - 웹 MVP의 핵심 차별화 요소
   - 모바일 앱 연동 준비

### 10.2 장기 전략

- **Phase 1 완료 후**: 초기 파일럿 사용자(의료진 3-5명) 모집
- **Phase 2 이전**: 사용자 피드백 수렴, 우선순위 재조정
- **Phase 3 계획**: 친구 시스템, 푸시 알림 등 소셜 기능 검토

### 10.3 최종 권고

**즉시 적용 추천**:
- profiles 확장 (user_type, level, xp)
- patients 테이블
- clinician_patient_relationships 테이블
- rom_measurements 테이블

**Phase 2로 보류 추천**:
- 게이미피케이션 (achievements, daily_stats)
- 처방 시스템 (clinician_prescriptions)

**Phase 3 이후 검토 추천**:
- 친구 시스템
- 푸시 알림
- API 쿼터
- 고급 스토리 시스템

---

## 부록 A: 마이그레이션 체크리스트

### 마이그레이션 전
- [ ] 프로덕션 데이터베이스 전체 백업
- [ ] 로컬 환경에서 마이그레이션 테스트
- [ ] 롤백 스크립트 준비
- [ ] 다운타임 공지

### 마이그레이션 중
- [ ] 읽기 전용 모드 활성화
- [ ] 마이그레이션 SQL 실행
- [ ] 데이터 무결성 검증 (FK, 제약조건)
- [ ] RLS 정책 적용

### 마이그레이션 후
- [ ] 샘플 쿼리 성능 테스트
- [ ] 환자/의료진 시나리오 테스트
- [ ] 프론트엔드 동작 확인
- [ ] 모니터링 대시보드 확인

---

## 부록 B: 참고 쿼리 예시

### 의료진 대시보드 - 담당 환자 목록
```sql
SELECT
  p.id,
  prof.display_name,
  p.rehabilitation_mode,
  p.current_phase,
  COUNT(DISTINCT es.id) as total_sessions,
  MAX(es.started_at) as last_session,
  AVG(es.average_accuracy) as avg_accuracy
FROM clinician_patient_relationships cpr
JOIN patients p ON p.id = cpr.patient_id
JOIN profiles prof ON prof.id = p.user_id
LEFT JOIN exercise_sessions es ON es.patient_id = p.id
WHERE cpr.clinician_id = auth.uid()
  AND cpr.status = 'active'
GROUP BY p.id, prof.display_name, p.rehabilitation_mode, p.current_phase
ORDER BY last_session DESC NULLS LAST;
```

### 환자 대시보드 - ROM 추이
```sql
SELECT
  joint_type,
  movement_type,
  affected_side,
  DATE_TRUNC('day', measured_at) as measurement_date,
  AVG(angle) as avg_angle,
  COUNT(*) as measurement_count
FROM rom_measurements
WHERE patient_id = (
  SELECT id FROM patients WHERE user_id = auth.uid()
)
  AND measured_at >= NOW() - INTERVAL '30 days'
  AND is_valid = true
GROUP BY joint_type, movement_type, affected_side, measurement_date
ORDER BY measurement_date DESC, joint_type;
```

### 통증 이벤트 모니터링 (의료진)
```sql
SELECT
  pe.id,
  prof.display_name as patient_name,
  pe.pain_level,
  pe.body_part,
  pe.exercise_id,
  pe.created_at,
  pe.clinician_notified
FROM pain_events pe
JOIN patients p ON p.id = pe.patient_id
JOIN profiles prof ON prof.id = p.user_id
WHERE EXISTS (
  SELECT 1 FROM clinician_patient_relationships
  WHERE clinician_id = auth.uid()
    AND patient_id = pe.patient_id
    AND status = 'active'
)
  AND pe.pain_level >= 2
  AND pe.created_at >= NOW() - INTERVAL '7 days'
ORDER BY pe.created_at DESC;
```

---

**작성자**: Claude (HearO Database Specialist)
**검토 필요**: 의료진 자문, 보안 감사, 법률 검토
