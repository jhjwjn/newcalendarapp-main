-- 파트너 연결 테이블 (커플 캘린더용)
-- Supabase SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS partner_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_code TEXT UNIQUE,
  status TEXT DEFAULT 'pending', -- pending | active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, partner_id)
);

ALTER TABLE partner_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own connections" ON partner_connections
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "insert own connection" ON partner_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own connection" ON partner_connections
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "delete own connection" ON partner_connections
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- 파트너의 이벤트를 읽을 수 있도록 events 테이블 정책 추가
-- (기존 "Users can view own events" 정책이 있다면 drop 후 재생성)
DROP POLICY IF EXISTS "partner can read events" ON events;

CREATE POLICY "partner can read events" ON events
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM partner_connections pc
      WHERE pc.status = 'active'
        AND (
          (pc.user_id = auth.uid() AND pc.partner_id = events.user_id)
          OR (pc.partner_id = auth.uid() AND pc.user_id = events.user_id)
        )
    )
  );
