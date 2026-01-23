-- HearO-Web 통증 기록 테이블 추가
-- Supabase SQL Editor에서 실행

-- pain_records 테이블 (통증 기록)
CREATE TABLE IF NOT EXISTS pain_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  body_part TEXT NOT NULL,
  pain_level INTEGER NOT NULL CHECK (pain_level >= 1 AND pain_level <= 5),
  pain_type TEXT CHECK (pain_type IN ('sharp', 'dull', 'burning', 'aching', 'other')),
  timing TEXT CHECK (timing IN ('before', 'during', 'after')),
  notes TEXT,
  session_id UUID REFERENCES exercise_sessions(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pain_records_user_id ON pain_records(user_id);
CREATE INDEX IF NOT EXISTS idx_pain_records_timestamp ON pain_records(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pain_records_body_part ON pain_records(body_part);

-- RLS 활성화
ALTER TABLE pain_records ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view own pain records" ON pain_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pain records" ON pain_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pain records" ON pain_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pain records" ON pain_records FOR DELETE USING (auth.uid() = user_id);
