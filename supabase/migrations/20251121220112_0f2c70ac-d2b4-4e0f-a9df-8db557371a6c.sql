-- Add achievement streak tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS achievement_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_achievement_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_achievement_date TIMESTAMP WITH TIME ZONE;

-- Add combo tracking to user_achievements
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS part_of_combo BOOLEAN DEFAULT false;
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS combo_size INTEGER;

-- Create achievement stats view for analytics
CREATE OR REPLACE VIEW achievement_stats AS
SELECT 
  a.id,
  a.name,
  a.rarity,
  a.category,
  COUNT(ua.user_id) as unlock_count,
  ROUND(
    (COUNT(ua.user_id)::numeric / NULLIF((SELECT COUNT(*) FROM profiles), 0)) * 100, 
    2
  ) as unlock_percentage
FROM achievements a
LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
GROUP BY a.id, a.name, a.rarity, a.category;

-- Grant access to the view
GRANT SELECT ON achievement_stats TO authenticated;

-- Create function to update achievement streaks
CREATE OR REPLACE FUNCTION update_achievement_streak(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_streak INTEGER;
  last_date TIMESTAMP WITH TIME ZONE;
  time_diff INTERVAL;
BEGIN
  -- Get current streak and last achievement date
  SELECT achievement_streak, last_achievement_date
  INTO current_streak, last_date
  FROM profiles
  WHERE id = user_id_param;

  -- If this is the first achievement
  IF last_date IS NULL THEN
    UPDATE profiles 
    SET 
      achievement_streak = 1,
      best_achievement_streak = GREATEST(1, COALESCE(best_achievement_streak, 0)),
      last_achievement_date = NOW()
    WHERE id = user_id_param;
    RETURN 1;
  END IF;

  -- Calculate time difference
  time_diff := NOW() - last_date;

  -- If within 24 hours, increment streak
  IF time_diff < INTERVAL '24 hours' THEN
    current_streak := COALESCE(current_streak, 0) + 1;
    UPDATE profiles 
    SET 
      achievement_streak = current_streak,
      best_achievement_streak = GREATEST(current_streak, COALESCE(best_achievement_streak, 0)),
      last_achievement_date = NOW()
    WHERE id = user_id_param;
    RETURN current_streak;
  
  -- If within 48 hours, maintain streak
  ELSIF time_diff < INTERVAL '48 hours' THEN
    UPDATE profiles 
    SET last_achievement_date = NOW()
    WHERE id = user_id_param;
    RETURN COALESCE(current_streak, 0);
  
  -- Otherwise, reset streak
  ELSE
    UPDATE profiles 
    SET 
      achievement_streak = 1,
      last_achievement_date = NOW()
    WHERE id = user_id_param;
    RETURN 1;
  END IF;
END;
$$;