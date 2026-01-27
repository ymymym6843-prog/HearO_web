-- =============================================
-- API Quota System Migration
-- API 비용 관리를 위한 쿼터 시스템
-- HearO-v2에서 포팅
-- =============================================

-- 1. API 타입 enum
DO $$ BEGIN
  CREATE TYPE api_type AS ENUM ('story', 'image', 'tts');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. API 사용량 추적 테이블
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_type api_type NOT NULL,

  -- 사용량 정보
  tokens_used INTEGER DEFAULT 0,
  cost_estimate DECIMAL(10, 6) DEFAULT 0, -- USD 기준

  -- 요청 정보
  request_type TEXT, -- 'sessionStart', 'sessionComplete', 'background' 등
  model_used TEXT, -- 'gemini-2.5-flash', 'imagen-3' 등
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- 메타데이터
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. API 쿼터 설정 테이블
CREATE TABLE IF NOT EXISTS api_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_type api_type NOT NULL,

  -- 제한 설정
  daily_limit INTEGER NOT NULL DEFAULT 50,
  monthly_limit INTEGER NOT NULL DEFAULT 500,

  -- 현재 사용량 (캐시)
  current_daily INTEGER DEFAULT 0,
  current_monthly INTEGER DEFAULT 0,

  -- 리셋 시간
  daily_reset_at TIMESTAMPTZ DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
  monthly_reset_at TIMESTAMPTZ DEFAULT (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'),

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 사용자+API 타입 유니크
  UNIQUE(user_id, api_type)
);

-- 4. 전역 쿼터 설정 (MVP 기준: 30,000원/월)
INSERT INTO api_quotas (user_id, api_type, daily_limit, monthly_limit)
VALUES
  (NULL, 'story', 30, 300),
  (NULL, 'image', 10, 100),
  (NULL, 'tts', 50, 500)
ON CONFLICT (user_id, api_type) DO NOTHING;

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_type ON api_usage(api_type);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_type_date ON api_usage(user_id, api_type, created_at);

CREATE INDEX IF NOT EXISTS idx_api_quotas_user_id ON api_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_api_quotas_user_type ON api_quotas(user_id, api_type);

-- 6. 쿼터 확인 함수
CREATE OR REPLACE FUNCTION check_api_quota(
  p_user_id UUID,
  p_api_type api_type
) RETURNS JSONB AS $$
DECLARE
  v_quota RECORD;
  v_daily_usage INTEGER;
  v_monthly_usage INTEGER;
  v_result JSONB;
BEGIN
  -- 사용자 쿼터 또는 전역 쿼터 조회
  SELECT * INTO v_quota
  FROM api_quotas
  WHERE (user_id = p_user_id OR user_id IS NULL)
    AND api_type = p_api_type
  ORDER BY user_id NULLS LAST
  LIMIT 1;

  -- 쿼터가 없으면 기본값 사용
  IF v_quota IS NULL THEN
    v_quota.daily_limit := CASE p_api_type
      WHEN 'story' THEN 50
      WHEN 'image' THEN 10
      WHEN 'tts' THEN 100
    END;
    v_quota.monthly_limit := v_quota.daily_limit * 10;
  END IF;

  -- 오늘 사용량 계산
  SELECT COUNT(*) INTO v_daily_usage
  FROM api_usage
  WHERE user_id = p_user_id
    AND api_type = p_api_type
    AND created_at >= CURRENT_DATE
    AND success = true;

  -- 이번 달 사용량 계산
  SELECT COUNT(*) INTO v_monthly_usage
  FROM api_usage
  WHERE user_id = p_user_id
    AND api_type = p_api_type
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND success = true;

  -- 결과 반환
  v_result := jsonb_build_object(
    'allowed', (v_daily_usage < v_quota.daily_limit AND v_monthly_usage < v_quota.monthly_limit),
    'daily_limit', v_quota.daily_limit,
    'daily_used', v_daily_usage,
    'daily_remaining', GREATEST(0, v_quota.daily_limit - v_daily_usage),
    'monthly_limit', v_quota.monthly_limit,
    'monthly_used', v_monthly_usage,
    'monthly_remaining', GREATEST(0, v_quota.monthly_limit - v_monthly_usage),
    'reset_daily_at', (CURRENT_DATE + INTERVAL '1 day')::TEXT,
    'reset_monthly_at', (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::TEXT
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 사용량 기록 함수
CREATE OR REPLACE FUNCTION record_api_usage(
  p_user_id UUID,
  p_api_type api_type,
  p_tokens_used INTEGER DEFAULT 0,
  p_cost_estimate DECIMAL DEFAULT 0,
  p_request_type TEXT DEFAULT NULL,
  p_model_used TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_usage_id UUID;
BEGIN
  INSERT INTO api_usage (
    user_id, api_type, tokens_used, cost_estimate,
    request_type, model_used, success, error_message, metadata
  ) VALUES (
    p_user_id, p_api_type, p_tokens_used, p_cost_estimate,
    p_request_type, p_model_used, p_success, p_error_message, p_metadata
  )
  RETURNING id INTO v_usage_id;

  -- 쿼터 캐시 업데이트 (성공한 경우만)
  IF p_success THEN
    INSERT INTO api_quotas (user_id, api_type, current_daily, current_monthly)
    VALUES (p_user_id, p_api_type, 1, 1)
    ON CONFLICT (user_id, api_type) DO UPDATE SET
      current_daily = api_quotas.current_daily + 1,
      current_monthly = api_quotas.current_monthly + 1,
      updated_at = NOW();
  END IF;

  RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 일일 쿼터 리셋 함수 (cron job용)
CREATE OR REPLACE FUNCTION reset_daily_quotas() RETURNS void AS $$
BEGIN
  UPDATE api_quotas
  SET
    current_daily = 0,
    daily_reset_at = CURRENT_DATE + INTERVAL '1 day',
    updated_at = NOW()
  WHERE daily_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 월간 쿼터 리셋 함수 (cron job용)
CREATE OR REPLACE FUNCTION reset_monthly_quotas() RETURNS void AS $$
BEGIN
  UPDATE api_quotas
  SET
    current_monthly = 0,
    monthly_reset_at = DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month',
    updated_at = NOW()
  WHERE monthly_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 사용량 통계 뷰
CREATE OR REPLACE VIEW api_usage_stats AS
SELECT
  user_id,
  api_type,
  DATE(created_at) AS usage_date,
  COUNT(*) AS request_count,
  SUM(tokens_used) AS total_tokens,
  SUM(cost_estimate) AS total_cost,
  COUNT(*) FILTER (WHERE success = true) AS success_count,
  COUNT(*) FILTER (WHERE success = false) AS error_count
FROM api_usage
GROUP BY user_id, api_type, DATE(created_at);

-- 11. RLS 정책
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_quotas ENABLE ROW LEVEL SECURITY;

-- api_usage: 사용자 본인 데이터만 조회, 서비스 역할은 모두 접근
CREATE POLICY "Users can view own api_usage"
  ON api_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage api_usage"
  ON api_usage FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Edge Functions에서 사용할 수 있도록 anon도 insert 허용
CREATE POLICY "Anon can insert api_usage"
  ON api_usage FOR INSERT
  WITH CHECK (true);

-- api_quotas: 사용자 본인 + 전역(NULL) 조회
CREATE POLICY "Users can view own and global quotas"
  ON api_quotas FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Service role can manage api_quotas"
  ON api_quotas FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 12. 코멘트
COMMENT ON TABLE api_usage IS 'API 사용량 추적 테이블';
COMMENT ON TABLE api_quotas IS 'API 쿼터 설정 (MVP: 30,000원/월 예산 기준)';
COMMENT ON FUNCTION check_api_quota IS '사용자의 API 쿼터 확인';
COMMENT ON FUNCTION record_api_usage IS 'API 사용량 기록';
COMMENT ON FUNCTION reset_daily_quotas IS '일일 쿼터 리셋 (cron job)';
COMMENT ON FUNCTION reset_monthly_quotas IS '월간 쿼터 리셋 (cron job)';
