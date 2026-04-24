-- XP Events Table — tracks every XP award for rank progression
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS xp_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  text NOT NULL,        -- matches roster.id OR Zustand student.id
  class_name  text NOT NULL,
  event_type  text NOT NULL,        -- 'game_correct', 'team_win', 'manual_award', etc.
  xp_amount   integer NOT NULL,
  game_type   text,                 -- 'fix-it', 'jeopardy', etc.
  created_at  timestamptz DEFAULT now()
);

-- Index for fast per-student lookups
CREATE INDEX IF NOT EXISTS idx_xp_events_student_id ON xp_events(student_id);

-- Index for class-based queries
CREATE INDEX IF NOT EXISTS idx_xp_events_class_name ON xp_events(class_name);

-- Aggregated XP view for quick totals
CREATE OR REPLACE VIEW student_xp_totals AS
  SELECT student_id, class_name, SUM(xp_amount) AS total_xp
  FROM xp_events
  GROUP BY student_id, class_name;
