# HearO-Web Medical Core 마이그레이션 가이드

**버전**: Phase 1 - Medical Core
**작성일**: 2026-01-24
**예상 소요 시간**: 1-2시간

---

## 개요

이 가이드는 HearO_web에 HearO-v2의 의료 기능(환자 관리, 의료진 연결, ROM 측정)을 안전하게 통합하는 과정을 안내합니다.

---

## 사전 준비

### 1. 요구사항 확인

- [ ] Supabase 프로젝트 접근 권한
- [ ] 로컬 개발 환경 (Node.js 18+, npm/yarn)
- [ ] Git 저장소 백업
- [ ] 데이터베이스 백업 (운영 환경)

### 2. 백업 생성

#### A. 프로덕션 환경
```bash
# Supabase CLI로 백업
supabase db dump -f backup_before_migration_$(date +%Y%m%d).sql

# 또는 Supabase Dashboard에서 수동 백업
# Settings > Database > Database Backups
```

#### B. 로컬 환경
```bash
# 로컬 Supabase 컨테이너 백업
docker exec supabase_db_hearo_web pg_dump -U postgres postgres > local_backup.sql
```

### 3. 의존성 업데이트

```bash
cd C:\Users\dbals\VibeCoding\HearO_web

# Supabase 클라이언트 최신 버전 확인
npm outdated @supabase/supabase-js

# 필요시 업데이트
npm update @supabase/supabase-js
```

---

## 마이그레이션 단계

### Step 1: 로컬 환경에서 마이그레이션 테스트

#### 1.1 로컬 Supabase 시작

```bash
cd C:\Users\dbals\VibeCoding\HearO_web

# Supabase 로컬 시작
supabase start

# 상태 확인
supabase status
```

**출력 예시**:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
```

#### 1.2 마이그레이션 파일 확인

```bash
# 마이그레이션 파일 목록
ls -la supabase/migrations/

# 예상 출력:
# 001_initial_schema.sql
# 002_pain_records.sql
# 003_medical_core.sql (새로 추가)
```

#### 1.3 마이그레이션 실행

```bash
# 로컬에 마이그레이션 적용
supabase db reset

# 또는 특정 마이그레이션만 실행
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/003_medical_core.sql
```

#### 1.4 마이그레이션 검증

```sql
-- Supabase Studio (http://localhost:54323)에서 실행

-- 1. 새 테이블 존재 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('patients', 'clinician_patient_relationships', 'rom_measurements', 'pain_events')
ORDER BY table_name;

-- 2. profiles 테이블 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('user_type', 'level', 'total_xp', 'current_streak', 'longest_streak')
ORDER BY ordinal_position;

-- 3. 외래 키 제약조건 확인
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('patients', 'rom_measurements', 'pain_events')
ORDER BY tc.table_name, tc.constraint_name;

-- 4. RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('patients', 'clinician_patient_relationships', 'rom_measurements', 'pain_events')
ORDER BY tablename, policyname;

-- 5. 헬퍼 함수 확인
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_clinician_patients', 'get_patient_rom_trend', 'get_recent_pain_events')
ORDER BY routine_name;
```

**예상 결과**:
- 4개의 새 테이블 (patients, clinician_patient_relationships, rom_measurements, pain_events)
- profiles 테이블에 5개의 새 컬럼
- 각 테이블마다 2개 이상의 RLS 정책
- 3개의 헬퍼 함수

#### 1.5 샘플 데이터 테스트

```sql
-- 1. 테스트 사용자 생성 (Supabase Auth)
-- Supabase Studio > Authentication > Users > Add User
-- Email: test-patient@example.com
-- Password: test123456

-- 2. 환자 프로필 업데이트
UPDATE profiles
SET user_type = 'patient', level = 1, total_xp = 0
WHERE email = 'test-patient@example.com';

-- 3. 환자 의료 정보 생성
INSERT INTO patients (user_id, rehabilitation_mode, current_phase, eligibility_checked, eligibility_passed)
SELECT id, 'knee', 1, true, true
FROM profiles
WHERE email = 'test-patient@example.com';

-- 4. 테스트 운동 세션 생성
INSERT INTO exercise_sessions (
  user_id, exercise_type, program_type, target_reps, patient_id, completion_status
)
SELECT
  p.user_id,
  'knee_flexion',
  'rehab',
  10,
  p.id,
  'in_progress'
FROM patients p
JOIN profiles prof ON prof.id = p.user_id
WHERE prof.email = 'test-patient@example.com';

-- 5. ROM 측정 데이터 생성
INSERT INTO rom_measurements (
  patient_id, session_id, joint_type, movement_type, angle, affected_side, measurement_type, confidence
)
SELECT
  p.id,
  es.id,
  'knee',
  'flexion',
  95.5,
  'right',
  'active',
  0.92
FROM patients p
JOIN profiles prof ON prof.id = p.user_id
JOIN exercise_sessions es ON es.user_id = prof.id
WHERE prof.email = 'test-patient@example.com'
LIMIT 1;

-- 6. 통증 이벤트 생성
INSERT INTO pain_events (patient_id, session_id, pain_level, body_part, notes)
SELECT
  p.id,
  es.id,
  1,
  'knee',
  '운동 중 경미한 통증'
FROM patients p
JOIN profiles prof ON prof.id = p.user_id
JOIN exercise_sessions es ON es.user_id = prof.id
WHERE prof.email = 'test-patient@example.com'
LIMIT 1;

-- 7. 데이터 조회 확인
SELECT
  prof.email,
  p.rehabilitation_mode,
  p.current_phase,
  COUNT(DISTINCT rm.id) as rom_count,
  COUNT(DISTINCT pe.id) as pain_event_count
FROM profiles prof
JOIN patients p ON p.user_id = prof.id
LEFT JOIN rom_measurements rm ON rm.patient_id = p.id
LEFT JOIN pain_events pe ON pe.patient_id = p.id
WHERE prof.email = 'test-patient@example.com'
GROUP BY prof.email, p.rehabilitation_mode, p.current_phase;
```

**예상 결과**:
```
email                        | rehabilitation_mode | current_phase | rom_count | pain_event_count
-----------------------------+--------------------+---------------+-----------+-----------------
test-patient@example.com     | knee               | 1             | 1         | 1
```

#### 1.6 RLS 정책 테스트

```sql
-- 1. 테스트 의료진 사용자 생성
-- Supabase Studio > Authentication > Users > Add User
-- Email: test-clinician@example.com
-- Password: test123456

UPDATE profiles
SET user_type = 'clinician', license_number = 'TEST-12345', hospital = 'Test Hospital'
WHERE email = 'test-clinician@example.com';

-- 2. 의료진-환자 관계 생성
INSERT INTO clinician_patient_relationships (clinician_id, patient_id)
SELECT
  (SELECT id FROM profiles WHERE email = 'test-clinician@example.com'),
  (SELECT id FROM patients WHERE user_id = (SELECT id FROM profiles WHERE email = 'test-patient@example.com'));

-- 3. 의료진이 환자 데이터 조회 가능한지 확인
-- (Supabase Studio에서 test-clinician@example.com으로 로그인 후)
SELECT * FROM get_clinician_patients(
  (SELECT id FROM profiles WHERE email = 'test-clinician@example.com')
);

-- 4. 의료진이 환자의 ROM 데이터 조회 가능한지 확인
SELECT * FROM rom_measurements
WHERE patient_id IN (
  SELECT patient_id FROM clinician_patient_relationships
  WHERE clinician_id = (SELECT id FROM profiles WHERE email = 'test-clinician@example.com')
);
```

### Step 2: 프론트엔드 타입 통합

#### 2.1 타입 파일 확인

```bash
# 타입 파일이 생성되었는지 확인
ls -la src/types/medical.ts
```

#### 2.2 기존 코드에서 타입 임포트

```typescript
// src/lib/supabase/medical.ts (새 파일 생성)
import { createClient } from '@supabase/supabase-js';
import type {
  Patient,
  PatientInsert,
  ROMMeasurement,
  ROMMeasurementInsert,
  PainEvent,
  PainEventInsert,
  ClinicianPatientSummary,
} from '@/types/medical';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 환자 프로필 조회
export async function getPatientProfile(userId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', userId)
    .single();

  return { data: data as Patient | null, error };
}

// ROM 측정 데이터 저장
export async function saveROMMeasurement(measurement: ROMMeasurementInsert) {
  const { data, error } = await supabase
    .from('rom_measurements')
    .insert(measurement)
    .select()
    .single();

  return { data: data as ROMMeasurement | null, error };
}

// 통증 이벤트 기록
export async function reportPainEvent(painEvent: PainEventInsert) {
  const { data, error } = await supabase
    .from('pain_events')
    .insert(painEvent)
    .select()
    .single();

  return { data: data as PainEvent | null, error };
}

// 의료진 담당 환자 목록
export async function getClinicianPatients(clinicianId: string) {
  const { data, error } = await supabase
    .rpc('get_clinician_patients', { clinician_user_id: clinicianId });

  return { data: data as ClinicianPatientSummary[] | null, error };
}
```

#### 2.3 TypeScript 컴파일 확인

```bash
# TypeScript 컴파일 에러 확인
npm run build

# 또는 타입 체크만
npx tsc --noEmit
```

### Step 3: 프로덕션 배포

#### 3.1 마이그레이션 파일 배포 (Supabase Dashboard)

1. **Supabase Dashboard 접속**
   - https://app.supabase.com
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴 > SQL Editor

3. **마이그레이션 SQL 실행**
   ```
   C:\Users\dbals\VibeCoding\HearO_web\supabase\migrations\003_medical_core.sql
   ```
   - 파일 내용 복사 > SQL Editor에 붙여넣기
   - 'Run' 버튼 클릭

4. **실행 결과 확인**
   - 에러 없이 완료되었는지 확인
   - 하단에 "Success" 메시지 확인

#### 3.2 마이그레이션 검증 (프로덕션)

```sql
-- 1. 테이블 존재 확인
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('patients', 'clinician_patient_relationships', 'rom_measurements', 'pain_events');
-- 예상 결과: 4

-- 2. RLS 활성화 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('patients', 'clinician_patient_relationships', 'rom_measurements', 'pain_events');
-- 모든 테이블의 rowsecurity가 true여야 함

-- 3. 기존 사용자 데이터 확인
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE user_type = 'patient') as patients,
  COUNT(*) FILTER (WHERE user_type = 'clinician') as clinicians
FROM profiles;
```

#### 3.3 애플리케이션 배포

```bash
# 코드 커밋
git add .
git commit -m "feat: Add Medical Core (HearO-v2 integration)"

# 프로덕션 배포 (Vercel/Netlify 등)
npm run deploy
# 또는
git push origin main  # (CI/CD 자동 배포)
```

### Step 4: 배포 후 검증

#### 4.1 헬스 체크

```bash
# API 엔드포인트 확인
curl https://your-app.vercel.app/api/health

# 데이터베이스 연결 확인
curl https://your-app.vercel.app/api/db-check
```

#### 4.2 기능 테스트 시나리오

**시나리오 1: 환자 등록**
1. 신규 사용자 가입
2. 프로필에서 user_type='patient' 확인
3. 환자 의료 정보 입력 (rehabilitation_mode, current_phase)
4. patients 테이블에 데이터 저장 확인

**시나리오 2: ROM 측정**
1. 환자로 로그인
2. 운동 세션 시작
3. ROM 측정 수행 (예: 무릎 굴곡 90도)
4. rom_measurements 테이블에 데이터 저장 확인
5. 대시보드에서 ROM 추이 그래프 확인

**시나리오 3: 통증 보고**
1. 운동 중 통증 발생 시 보고 버튼 클릭
2. 통증 레벨(0-3) 및 부위 선택
3. pain_events 테이블에 데이터 저장 확인
4. 의료진 대시보드에서 통증 알림 확인

**시나리오 4: 의료진 대시보드**
1. 의료진 계정으로 로그인
2. 담당 환자 목록 조회 (get_clinician_patients 함수)
3. 특정 환자의 ROM 추이 조회 (get_patient_rom_trend 함수)
4. 최근 통증 이벤트 조회 (get_recent_pain_events 함수)

#### 4.3 성능 모니터링

```sql
-- 쿼리 성능 확인 (Supabase Dashboard > Database > Query Performance)

-- 1. 가장 느린 쿼리 TOP 10
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 2. 인덱스 사용률 확인
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('patients', 'rom_measurements', 'pain_events')
ORDER BY idx_scan DESC;

-- 3. 테이블 크기 확인
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 롤백 절차

마이그레이션 중 문제 발생 시 다음 절차로 롤백합니다.

### 1. 즉시 롤백 (5분 이내)

```bash
# 롤백 스크립트 실행
psql $DATABASE_URL -f supabase/migrations/003_medical_core_rollback.sql

# 또는 Supabase Dashboard SQL Editor에서
# 003_medical_core_rollback.sql 파일 내용 실행
```

### 2. 백업 복원 (완전 롤백)

```bash
# 프로덕션 백업 복원 (Supabase Dashboard)
# Settings > Database > Database Backups > Restore

# 또는 CLI
supabase db restore backup_before_migration_20260124.sql
```

### 3. 애플리케이션 롤백

```bash
# Git 이전 커밋으로 복원
git revert HEAD
git push origin main

# 또는 특정 커밋으로 롤백
git reset --hard <previous-commit-hash>
git push -f origin main
```

---

## 트러블슈팅

### 문제 1: 마이그레이션 실행 시 "relation already exists" 에러

**원인**: 이전 마이그레이션 시도에서 일부 테이블만 생성됨

**해결 방법**:
```sql
-- 기존 테이블 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('patients', 'clinician_patient_relationships', 'rom_measurements', 'pain_events');

-- 문제 테이블 수동 삭제 후 재실행
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS clinician_patient_relationships CASCADE;
DROP TABLE IF EXISTS rom_measurements CASCADE;
DROP TABLE IF EXISTS pain_events CASCADE;

-- 마이그레이션 재실행
```

### 문제 2: RLS 정책으로 인한 데이터 접근 불가

**원인**: RLS 정책이 너무 엄격하게 설정됨

**해결 방법**:
```sql
-- 임시로 RLS 비활성화 (디버깅용)
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;

-- 데이터 확인 후 재활성화
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'patients';
```

### 문제 3: 외래 키 제약조건 위반

**원인**: 기존 데이터와 새 스키마 간 불일치

**해결 방법**:
```sql
-- 외래 키 위반 데이터 확인
SELECT es.*
FROM exercise_sessions es
LEFT JOIN patients p ON p.id = es.patient_id
WHERE es.patient_id IS NOT NULL
  AND p.id IS NULL;

-- 잘못된 patient_id 제거
UPDATE exercise_sessions
SET patient_id = NULL
WHERE patient_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM patients WHERE id = exercise_sessions.patient_id);
```

### 문제 4: 헬퍼 함수 실행 오류

**원인**: 함수 권한 또는 파라미터 타입 불일치

**해결 방법**:
```sql
-- 함수 확인
\df get_clinician_patients

-- 함수 재생성
DROP FUNCTION IF EXISTS get_clinician_patients(UUID);
-- (003_medical_core.sql에서 해당 함수 부분만 재실행)

-- 함수 테스트
SELECT * FROM get_clinician_patients('00000000-0000-0000-0000-000000000000'::UUID);
```

---

## 마이그레이션 후 작업

### 1. 문서 업데이트

- [ ] API 문서에 새 엔드포인트 추가
- [ ] ERD 다이어그램 업데이트
- [ ] 사용자 가이드 업데이트 (의료진용)

### 2. 모니터링 설정

- [ ] Supabase Dashboard에서 알림 설정
  - 테이블 크기가 임계값 초과 시
  - 쿼리 응답 시간이 500ms 초과 시
- [ ] Sentry/LogRocket 등 에러 추적 도구 설정

### 3. 데이터 정리 작업

```sql
-- 1. 오래된 pain_records 테이블 제거 (데이터 마이그레이션 확인 후)
-- DROP TABLE IF EXISTS pain_records;

-- 2. 중복 데이터 정리
DELETE FROM rom_measurements
WHERE id NOT IN (
  SELECT MIN(id)
  FROM rom_measurements
  GROUP BY patient_id, joint_type, measured_at
);

-- 3. 유효하지 않은 데이터 정리
DELETE FROM rom_measurements
WHERE confidence < 0.5 OR is_valid = false;
```

### 4. 성능 최적화

```sql
-- 1. 인덱스 재구축 (프래그먼테이션 제거)
REINDEX TABLE rom_measurements;
REINDEX TABLE pain_events;

-- 2. VACUUM ANALYZE (통계 정보 갱신)
VACUUM ANALYZE patients;
VACUUM ANALYZE rom_measurements;
VACUUM ANALYZE pain_events;

-- 3. Materialized View 생성 (선택적)
CREATE MATERIALIZED VIEW mv_patient_rom_summary AS
SELECT
  patient_id,
  joint_type,
  DATE_TRUNC('week', measured_at) as week,
  AVG(angle) as avg_angle,
  MIN(angle) as min_angle,
  MAX(angle) as max_angle,
  COUNT(*) as measurement_count
FROM rom_measurements
WHERE is_valid = true
GROUP BY patient_id, joint_type, week;

CREATE INDEX idx_mv_patient_rom_patient ON mv_patient_rom_summary(patient_id);
```

---

## 체크리스트

### 마이그레이션 전
- [ ] 프로덕션 데이터베이스 백업 완료
- [ ] 로컬 환경에서 마이그레이션 테스트 성공
- [ ] 롤백 스크립트 준비
- [ ] 팀원에게 다운타임 공지 (필요시)

### 마이그레이션 중
- [ ] 읽기 전용 모드 활성화 (선택적)
- [ ] 003_medical_core.sql 실행
- [ ] 에러 없이 완료 확인
- [ ] 기본 검증 쿼리 실행

### 마이그레이션 후
- [ ] 모든 테이블 존재 확인
- [ ] RLS 정책 활성화 확인
- [ ] 샘플 데이터 생성 및 조회 테스트
- [ ] 프론트엔드 빌드 성공 확인
- [ ] 프로덕션 배포
- [ ] 기능 테스트 시나리오 통과
- [ ] 성능 모니터링 설정
- [ ] 문서 업데이트

---

## 추가 리소스

- **Supabase 공식 문서**: https://supabase.com/docs
- **PostgreSQL RLS 가이드**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **HearO-v2 스키마**: `C:\Users\dbals\VibeCoding\HearO-v2\supabase\migrations\001_create_tables.sql`
- **마이그레이션 검토 보고서**: `C:\Users\dbals\VibeCoding\HearO_web\docs\database_migration_review.md`

---

## 지원

마이그레이션 중 문제 발생 시:
1. 위 트러블슈팅 섹션 참조
2. Supabase 커뮤니티 포럼: https://github.com/supabase/supabase/discussions
3. 팀 내부 슬랙/디스코드 채널

---

**마지막 업데이트**: 2026-01-24
**작성자**: HearO Development Team
