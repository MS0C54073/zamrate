
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow postgres_changes only" ON realtime.messages;
CREATE POLICY "Allow postgres_changes only" ON realtime.messages
  FOR SELECT TO anon, authenticated
  USING (extension = 'postgres_changes');
