-- HearO-Web 초기 스키마
-- Supabase SQL Editor에서 실행

-- 1. profiles 테이블 (사용자 프로필)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  preferred_worldview TEXT CHECK (preferred_worldview IN ('fantasy', 'sf', 'sports', 'idol', 'spy', 'zombie'))
);

-- 2. exercise_sessions 테이블 (운동 세션)
CREATE TABLE IF NOT EXISTS exercise_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_type TEXT NOT NULL,
  worldview TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_reps INTEGER DEFAULT 0,
  target_reps INTEGER DEFAULT 10,
  average_accuracy NUMERIC(5,2) DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. exercise_reps 테이블 (각 반복 기록)
CREATE TABLE IF NOT EXISTS exercise_reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES exercise_sessions(id) ON DELETE CASCADE NOT NULL,
  rep_number INTEGER NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL,
  max_angle NUMERIC(5,2) DEFAULT 0,
  min_angle NUMERIC(5,2) DEFAULT 0,
  hold_time NUMERIC(5,2),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. calibrations 테이블 (캘리브레이션 데이터)
CREATE TABLE IF NOT EXISTS calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joint_type TEXT NOT NULL,
  start_angle NUMERIC(5,2) NOT NULL,
  target_angle NUMERIC(5,2) NOT NULL,
  tolerance NUMERIC(5,2) DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, joint_type)
);

-- 5. user_settings 테이블 (사용자 설정)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  haptic_enabled BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  tts_enabled BOOLEAN DEFAULT true,
  accessibility_mode BOOLEAN DEFAULT false,
  preferred_language TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_user_id ON exercise_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_started_at ON exercise_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_reps_session_id ON exercise_reps(session_id);
CREATE INDEX IF NOT EXISTS idx_calibrations_user_id ON calibrations(user_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 데이터만 접근 가능
-- profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- exercise_sessions
CREATE POLICY "Users can view own sessions" ON exercise_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON exercise_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON exercise_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON exercise_sessions FOR DELETE USING (auth.uid() = user_id);

-- exercise_reps
CREATE POLICY "Users can view own reps" ON exercise_reps FOR SELECT
  USING (EXISTS (SELECT 1 FROM exercise_sessions WHERE exercise_sessions.id = exercise_reps.session_id AND exercise_sessions.user_id = auth.uid()));
CREATE POLICY "Users can insert own reps" ON exercise_reps FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM exercise_sessions WHERE exercise_sessions.id = exercise_reps.session_id AND exercise_sessions.user_id = auth.uid()));

-- calibrations
CREATE POLICY "Users can view own calibrations" ON calibrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calibrations" ON calibrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calibrations" ON calibrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calibrations" ON calibrations FOR DELETE USING (auth.uid() = user_id);

-- user_settings
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calibrations_updated_at BEFORE UPDATE ON calibrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
