-- ============================================================
-- HearO-Web Phase 1: Medical Core Migration
-- HearO-v2의 의료 기능 코어를 HearO_web에 통합
-- Created: 2026-01-24
-- ============================================================

-- ============================================================
-- 1. PROFILES 테이블 확장
-- ============================================================

-- 사용자 타입 및 게임 관련 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_type TEXT
    CHECK (user_type IN ('patient', 'clinician', 'general'))
    DEFAULT 'patient',
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- 임상의사 전용 컬럼 (선택적)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS hospital TEXT,
  ADD COLUMN IF NOT EXISTS specialization TEXT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);

-- 기존 사용자는 모두 'patient'로 설정
UPDATE profiles SET user_type = 'patient' WHERE user_type IS NULL;

COMMENT ON COLUMN profiles.user_type IS '사용자 타입: patient(환자), clinician(의료진), general(일반)';
COMMENT ON COLUMN profiles.level IS '게임 레벨 (1부터 시작)';
COMMENT ON COLUMN profiles.total_xp IS '누적 경험치';
COMMENT ON COLUMN profiles.current_streak IS '현재 연속 운동 일수';
COMMENT ON COLUMN profiles.longest_streak IS '최장 연속 운동 일수';

-- ============================================================
-- 2. PATIENTS 테이블 (환자 의료 정보)
-- ============================================================

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  -- 의료 정보
  condition TEXT,
  rehabilitation_mode TEXT CHECK (rehabilitation_mode IN ('knee', 'shoulder', 'back', 'hip')),
  current_phase INTEGER DEFAULT 1 CHECK (current_phase BETWEEN 1 AND 5),

  -- 적합성 체크
  eligibility_checked BOOLEAN DEFAULT FALSE,
  eligibility_passed BOOLEAN,
  contraindications JSONB,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_rehabilitation_mode ON patients(rehabilitation_mode);
CREATE INDEX IF NOT EXISTS idx_patients_current_phase ON patients(current_phase);

-- RLS 활성화
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 환자는 자신의 의료 정보만 관리
CREATE POLICY "patients_own_data" ON patients
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS 정책: 의료진은 담당 환자 정보 조회만 가능
CREATE POLICY "patients_clinician_view" ON patients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinician_patient_relationships
      WHERE clinician_id = auth.uid()
      AND patient_id = patients.id
      AND status = 'active'
    )
  );

COMMENT ON TABLE patients IS '환자 의료 정보 및 재활 모드';
COMMENT ON COLUMN patients.rehabilitation_mode IS '재활 모드: knee(무릎), shoulder(어깨), back(허리), hip(고관절)';
COMMENT ON COLUMN patients.current_phase IS '현재 재활 단계 (1-5단계)';
COMMENT ON COLUMN patients.contraindications IS '금기 사항 (JSON 형식)';

-- ============================================================
-- 3. CLINICIAN_PATIENT_RELATIONSHIPS 테이블 (의료진-환자 관계)
-- ============================================================

CREATE TABLE IF NOT EXISTS clinician_patient_relationships (
  clinician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (clinician_id, patient_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_cpr_clinician ON clinician_patient_relationships(clinician_id);
CREATE INDEX IF NOT EXISTS idx_cpr_patient ON clinician_patient_relationships(patient_id);
CREATE INDEX IF NOT EXISTS idx_cpr_clinician_status
  ON clinician_patient_relationships(clinician_id, status)
  WHERE status = 'active';

-- RLS 활성화
ALTER TABLE clinician_patient_relationships ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 의료진은 자신의 관계 관리
CREATE POLICY "relationships_clinician_manage" ON clinician_patient_relationships
  FOR ALL
  USING (clinician_id = auth.uid());

-- RLS 정책: 환자는 자신이 속한 관계 조회
CREATE POLICY "relationships_patient_view" ON clinician_patient_relationships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = clinician_patient_relationships.patient_id
      AND patients.user_id = auth.uid()
    )
  );

COMMENT ON TABLE clinician_patient_relationships IS '의료진과 환자 간의 관계 테이블';
COMMENT ON COLUMN clinician_patient_relationships.status IS '관계 상태: active(활성), inactive(비활성)';

-- ============================================================
-- 4. ROM_MEASUREMENTS 테이블 (ROM 측정 데이터)
-- ============================================================

CREATE TABLE IF NOT EXISTS rom_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES exercise_sessions(id) ON DELETE SET NULL,

  -- ROM 측정 정보
  joint_type TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  angle NUMERIC NOT NULL,
  affected_side TEXT CHECK (affected_side IN ('left', 'right', 'bilateral')),
  measurement_type TEXT CHECK (measurement_type IN ('active', 'passive')),

  -- 품질 정보
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  is_valid BOOLEAN DEFAULT TRUE,
  compensation_detected BOOLEAN DEFAULT FALSE,

  -- 타임스탬프
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_rom_patient_id ON rom_measurements(patient_id);
CREATE INDEX IF NOT EXISTS idx_rom_session_id ON rom_measurements(session_id);
CREATE INDEX IF NOT EXISTS idx_rom_joint_type ON rom_measurements(joint_type);
CREATE INDEX IF NOT EXISTS idx_rom_measured_at ON rom_measurements(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_rom_patient_joint_time
  ON rom_measurements(patient_id, joint_type, measured_at DESC);

-- RLS 활성화
ALTER TABLE rom_measurements ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 환자는 자신의 ROM 데이터 관리
CREATE POLICY "rom_patient_own" ON rom_measurements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = rom_measurements.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- RLS 정책: 의료진은 담당 환자 ROM 조회만 가능
CREATE POLICY "rom_clinician_view" ON rom_measurements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinician_patient_relationships
      WHERE clinician_id = auth.uid()
      AND patient_id = rom_measurements.patient_id
      AND status = 'active'
    )
  );

COMMENT ON TABLE rom_measurements IS 'Range of Motion (ROM) 측정 데이터';
COMMENT ON COLUMN rom_measurements.joint_type IS '관절 타입 (예: shoulder, knee, elbow)';
COMMENT ON COLUMN rom_measurements.movement_type IS '움직임 타입 (예: flexion, extension, abduction)';
COMMENT ON COLUMN rom_measurements.affected_side IS '영향받은 측면: left(왼쪽), right(오른쪽), bilateral(양측)';
COMMENT ON COLUMN rom_measurements.measurement_type IS '측정 타입: active(능동), passive(수동)';
COMMENT ON COLUMN rom_measurements.confidence IS '측정 신뢰도 (0-1)';
COMMENT ON COLUMN rom_measurements.compensation_detected IS '보상 동작 감지 여부';

-- ============================================================
-- 5. EXERCISE_SESSIONS 테이블 확장
-- ============================================================

-- 의료 관련 컬럼 추가
ALTER TABLE exercise_sessions
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS program_type TEXT
    CHECK (program_type IN ('rehab', 'fitness')),
  ADD COLUMN IF NOT EXISTS thermal_events INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chapter_number INTEGER,
  ADD COLUMN IF NOT EXISTS episode_number INTEGER;

-- completion_status 컬럼 추가 (기존 status와 별도로)
ALTER TABLE exercise_sessions
  ADD COLUMN IF NOT EXISTS completion_status TEXT
    CHECK (completion_status IN ('completed', 'pain_stop', 'user_stop', 'error', 'in_progress'))
    DEFAULT 'in_progress';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_sessions_patient_started
  ON exercise_sessions(patient_id, started_at DESC)
  WHERE patient_id IS NOT NULL;

-- RLS 정책 업데이트: 의료진은 담당 환자 세션 조회 가능
DROP POLICY IF EXISTS "sessions_clinician_view" ON exercise_sessions;
CREATE POLICY "sessions_clinician_view" ON exercise_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinician_patient_relationships cpr
      JOIN patients p ON p.id = cpr.patient_id
      WHERE cpr.clinician_id = auth.uid()
      AND p.user_id = exercise_sessions.user_id
      AND cpr.status = 'active'
    )
  );

COMMENT ON COLUMN exercise_sessions.patient_id IS '환자 ID (환자인 경우 자동 설정)';
COMMENT ON COLUMN exercise_sessions.program_type IS '프로그램 타입: rehab(재활), fitness(피트니스)';
COMMENT ON COLUMN exercise_sessions.completion_status IS '완료 상태: completed(완료), pain_stop(통증 중단), user_stop(사용자 중단), error(오류), in_progress(진행중)';
COMMENT ON COLUMN exercise_sessions.thermal_events IS '과열 이벤트 횟수';

-- ============================================================
-- 6. PAIN_EVENTS 테이블 (통증 이벤트)
-- ============================================================

CREATE TABLE IF NOT EXISTS pain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES exercise_sessions(id) ON DELETE SET NULL,

  -- 통증 정보
  pain_level INTEGER NOT NULL CHECK (pain_level BETWEEN 0 AND 3),
  exercise_id TEXT,
  body_part TEXT,
  notes TEXT,

  -- 의료진 알림
  clinician_notified BOOLEAN DEFAULT FALSE,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_pain_patient_id ON pain_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_pain_session_id ON pain_events(session_id);
CREATE INDEX IF NOT EXISTS idx_pain_level ON pain_events(pain_level);
CREATE INDEX IF NOT EXISTS idx_pain_created_at ON pain_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pain_patient_level_time
  ON pain_events(patient_id, pain_level, created_at DESC)
  WHERE pain_level >= 2;

-- RLS 활성화
ALTER TABLE pain_events ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 환자는 자신의 통증 이벤트 관리
CREATE POLICY "pain_patient_own" ON pain_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = pain_events.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- RLS 정책: 의료진은 담당 환자 통증 이벤트 조회
CREATE POLICY "pain_clinician_view" ON pain_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinician_patient_relationships
      WHERE clinician_id = auth.uid()
      AND patient_id = pain_events.patient_id
      AND status = 'active'
    )
  );

COMMENT ON TABLE pain_events IS '통증 이벤트 기록';
COMMENT ON COLUMN pain_events.pain_level IS '통증 레벨 (0=없음, 1=경미, 2=중간, 3=심각)';
COMMENT ON COLUMN pain_events.clinician_notified IS '의료진 알림 전송 여부';

-- ============================================================
-- 7. 기존 PAIN_RECORDS 데이터 마이그레이션 (선택적)
-- ============================================================

-- 기존 pain_records 테이블이 존재하고 데이터가 있는 경우만 실행
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pain_records') THEN
    -- 먼저 모든 환자에 대한 patients 레코드 생성 (없는 경우)
    INSERT INTO patients (user_id, rehabilitation_mode, current_phase)
    SELECT DISTINCT
      pr.user_id,
      'knee' as rehabilitation_mode, -- 기본값
      1 as current_phase
    FROM pain_records pr
    WHERE NOT EXISTS (
      SELECT 1 FROM patients WHERE user_id = pr.user_id
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- pain_records -> pain_events 데이터 변환
    INSERT INTO pain_events (patient_id, session_id, pain_level, body_part, notes, created_at)
    SELECT
      p.id as patient_id,
      pr.session_id,
      -- 1-5 스케일 -> 0-3 스케일 변환
      CASE
        WHEN pr.pain_level = 1 THEN 0
        WHEN pr.pain_level = 2 THEN 1
        WHEN pr.pain_level IN (3, 4) THEN 2
        ELSE 3
      END as pain_level,
      pr.body_part,
      CONCAT_WS(' | ',
        CASE WHEN pr.pain_type IS NOT NULL THEN 'Type: ' || pr.pain_type ELSE NULL END,
        CASE WHEN pr.timing IS NOT NULL THEN 'Timing: ' || pr.timing ELSE NULL END,
        pr.notes
      ) as notes,
      pr.timestamp as created_at
    FROM pain_records pr
    JOIN patients p ON p.user_id = pr.user_id
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'pain_records 데이터 마이그레이션 완료';
  ELSE
    RAISE NOTICE 'pain_records 테이블이 존재하지 않음 - 마이그레이션 스킵';
  END IF;
END $$;

-- ============================================================
-- 8. UPDATED_AT 트리거 추가
-- ============================================================

-- patients 테이블 updated_at 트리거
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. 헬퍼 함수 (의료진 대시보드용)
-- ============================================================

-- 의료진의 담당 환자 목록 조회
CREATE OR REPLACE FUNCTION get_clinician_patients(clinician_user_id UUID)
RETURNS TABLE (
  patient_id UUID,
  patient_name TEXT,
  rehabilitation_mode TEXT,
  current_phase INTEGER,
  total_sessions BIGINT,
  last_session TIMESTAMPTZ,
  avg_accuracy NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    prof.full_name,
    p.rehabilitation_mode,
    p.current_phase,
    COUNT(DISTINCT es.id) as total_sessions,
    MAX(es.started_at) as last_session,
    AVG(es.average_accuracy) as avg_accuracy
  FROM clinician_patient_relationships cpr
  JOIN patients p ON p.id = cpr.patient_id
  JOIN profiles prof ON prof.id = p.user_id
  LEFT JOIN exercise_sessions es ON es.patient_id = p.id
  WHERE cpr.clinician_id = clinician_user_id
    AND cpr.status = 'active'
  GROUP BY p.id, prof.full_name, p.rehabilitation_mode, p.current_phase
  ORDER BY last_session DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 환자의 ROM 추이 조회
CREATE OR REPLACE FUNCTION get_patient_rom_trend(
  target_patient_id UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  joint_type TEXT,
  movement_type TEXT,
  affected_side TEXT,
  measurement_date DATE,
  avg_angle NUMERIC,
  measurement_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rom.joint_type,
    rom.movement_type,
    rom.affected_side,
    DATE(rom.measured_at) as measurement_date,
    AVG(rom.angle) as avg_angle,
    COUNT(*) as measurement_count
  FROM rom_measurements rom
  WHERE rom.patient_id = target_patient_id
    AND rom.measured_at >= NOW() - (days_back || ' days')::INTERVAL
    AND rom.is_valid = true
  GROUP BY rom.joint_type, rom.movement_type, rom.affected_side, DATE(rom.measured_at)
  ORDER BY measurement_date DESC, rom.joint_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 통증 이벤트 모니터링 (의료진용)
CREATE OR REPLACE FUNCTION get_recent_pain_events(
  clinician_user_id UUID,
  days_back INTEGER DEFAULT 7,
  min_pain_level INTEGER DEFAULT 2
)
RETURNS TABLE (
  event_id UUID,
  patient_name TEXT,
  pain_level INTEGER,
  body_part TEXT,
  exercise_id TEXT,
  created_at TIMESTAMPTZ,
  clinician_notified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.id,
    prof.full_name,
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
    WHERE clinician_id = clinician_user_id
      AND patient_id = pe.patient_id
      AND status = 'active'
  )
    AND pe.pain_level >= min_pain_level
    AND pe.created_at >= NOW() - (days_back || ' days')::INTERVAL
  ORDER BY pe.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_clinician_patients IS '의료진의 담당 환자 목록 조회';
COMMENT ON FUNCTION get_patient_rom_trend IS '환자의 ROM 측정 추이 조회';
COMMENT ON FUNCTION get_recent_pain_events IS '최근 통증 이벤트 조회 (의료진용)';

-- ============================================================
-- 10. 데이터 무결성 검증
-- ============================================================

-- 모든 외래 키 제약조건 확인
DO $$
DECLARE
  fk_check_result RECORD;
BEGIN
  FOR fk_check_result IN
    SELECT conname, conrelid::regclass
    FROM pg_constraint
    WHERE contype = 'f'
      AND connamespace = 'public'::regnamespace
      AND conrelid::regclass::text IN (
        'patients', 'clinician_patient_relationships',
        'rom_measurements', 'pain_events'
      )
  LOOP
    RAISE NOTICE 'FK 제약조건 확인: % on %', fk_check_result.conname, fk_check_result.conrelid;
  END LOOP;
END $$;

-- ============================================================
-- 11. 마이그레이션 완료 로그
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'HearO-Web Medical Core Migration 완료';
  RAISE NOTICE '========================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  - patients (환자 의료 정보)';
  RAISE NOTICE '  - clinician_patient_relationships (의료진-환자 관계)';
  RAISE NOTICE '  - rom_measurements (ROM 측정)';
  RAISE NOTICE '  - pain_events (통증 이벤트)';
  RAISE NOTICE '';
  RAISE NOTICE '확장된 테이블:';
  RAISE NOTICE '  - profiles (user_type, level, xp, streak)';
  RAISE NOTICE '  - exercise_sessions (patient_id, program_type)';
  RAISE NOTICE '';
  RAISE NOTICE '생성된 함수:';
  RAISE NOTICE '  - get_clinician_patients()';
  RAISE NOTICE '  - get_patient_rom_trend()';
  RAISE NOTICE '  - get_recent_pain_events()';
  RAISE NOTICE '========================================';
END $$;
