-- ============================================================
-- HearO-Web Phase 1: Medical Core Migration ROLLBACK
-- 003_medical_core.sql의 롤백 스크립트
-- Created: 2026-01-24
-- ============================================================

-- 경고: 이 스크립트는 마이그레이션을 완전히 되돌립니다.
-- 실행 전 데이터 백업을 확인하세요!

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Medical Core Migration 롤백 시작';
  RAISE NOTICE '경고: 데이터가 삭제될 수 있습니다!';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- 1. 헬퍼 함수 삭제
-- ============================================================

DROP FUNCTION IF EXISTS get_recent_pain_events(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_patient_rom_trend(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_clinician_patients(UUID);

RAISE NOTICE '헬퍼 함수 삭제 완료';

-- ============================================================
-- 2. PAIN_EVENTS 테이블 삭제
-- ============================================================

DROP TABLE IF EXISTS pain_events CASCADE;

RAISE NOTICE 'pain_events 테이블 삭제 완료';

-- ============================================================
-- 3. ROM_MEASUREMENTS 테이블 삭제
-- ============================================================

DROP TABLE IF EXISTS rom_measurements CASCADE;

RAISE NOTICE 'rom_measurements 테이블 삭제 완료';

-- ============================================================
-- 4. EXERCISE_SESSIONS 테이블 복원
-- ============================================================

-- 추가된 컬럼 제거
ALTER TABLE exercise_sessions
  DROP COLUMN IF EXISTS patient_id,
  DROP COLUMN IF EXISTS program_type,
  DROP COLUMN IF EXISTS thermal_events,
  DROP COLUMN IF EXISTS chapter_number,
  DROP COLUMN IF EXISTS episode_number,
  DROP COLUMN IF EXISTS completion_status;

-- 의료진 조회 RLS 정책 제거
DROP POLICY IF EXISTS "sessions_clinician_view" ON exercise_sessions;

RAISE NOTICE 'exercise_sessions 테이블 복원 완료';

-- ============================================================
-- 5. CLINICIAN_PATIENT_RELATIONSHIPS 테이블 삭제
-- ============================================================

DROP TABLE IF EXISTS clinician_patient_relationships CASCADE;

RAISE NOTICE 'clinician_patient_relationships 테이블 삭제 완료';

-- ============================================================
-- 6. PATIENTS 테이블 삭제
-- ============================================================

DROP TABLE IF EXISTS patients CASCADE;

RAISE NOTICE 'patients 테이블 삭제 완료';

-- ============================================================
-- 7. PROFILES 테이블 복원
-- ============================================================

-- 추가된 컬럼 제거
ALTER TABLE profiles
  DROP COLUMN IF EXISTS user_type,
  DROP COLUMN IF EXISTS level,
  DROP COLUMN IF EXISTS total_xp,
  DROP COLUMN IF EXISTS current_streak,
  DROP COLUMN IF EXISTS longest_streak,
  DROP COLUMN IF EXISTS license_number,
  DROP COLUMN IF EXISTS hospital,
  DROP COLUMN IF EXISTS specialization;

-- 추가된 인덱스 제거
DROP INDEX IF EXISTS idx_profiles_user_type;

RAISE NOTICE 'profiles 테이블 복원 완료';

-- ============================================================
-- 8. 롤백 완료 확인
-- ============================================================

DO $$
DECLARE
  remaining_tables TEXT[];
BEGIN
  SELECT ARRAY_AGG(tablename)
  INTO remaining_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('patients', 'clinician_patient_relationships', 'rom_measurements', 'pain_events');

  IF remaining_tables IS NOT NULL THEN
    RAISE WARNING '롤백 후에도 다음 테이블이 남아있습니다: %', remaining_tables;
  ELSE
    RAISE NOTICE '모든 Medical Core 테이블이 성공적으로 제거되었습니다.';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Medical Core Migration 롤백 완료';
  RAISE NOTICE '========================================';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '  1. 백업 데이터 복원 (필요시)';
  RAISE NOTICE '  2. 애플리케이션 코드 이전 버전으로 복원';
  RAISE NOTICE '  3. Supabase 클라이언트 재시작';
  RAISE NOTICE '========================================';
END $$;
