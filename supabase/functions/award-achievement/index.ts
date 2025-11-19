import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AwardRequest {
  user_id: string;
  event_type: 'profile_complete' | 'payment_complete' | 'level_reach' | 'xp_total' | 'trades_complete' | 'referrals' | 'gear_collected' | 'vault_first_access';
  event_data?: {
    level?: number;
    xp_total?: number;
    trades_count?: number;
    referrals_count?: number;
    gear_count?: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { user_id, event_type, event_data }: AwardRequest = await req.json();

    if (!user_id || !event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or event_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Award Achievement] Checking achievements for user ${user_id}, event: ${event_type}`, event_data);

    // Get all achievements
    const { data: achievements, error: achError } = await supabaseClient
      .from('achievements')
      .select('*');

    if (achError) {
      console.error('[Award Achievement] Error fetching achievements:', achError);
      throw achError;
    }

    // Get user's already unlocked achievements
    const { data: userAchievements, error: userAchError } = await supabaseClient
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user_id);

    if (userAchError) {
      console.error('[Award Achievement] Error fetching user achievements:', userAchError);
      throw userAchError;
    }

    const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);
    const newlyAwarded = [];

    // Check each achievement's unlock condition
    for (const achievement of achievements || []) {
      // Skip if already unlocked
      if (unlockedIds.has(achievement.id)) {
        continue;
      }

      const condition = achievement.unlock_condition;
      let shouldAward = false;

      // Check if the event type matches
      if (condition.type === event_type) {
        switch (event_type) {
          case 'profile_complete':
          case 'payment_complete':
          case 'vault_first_access':
            // Simple boolean conditions
            shouldAward = true;
            break;

          case 'level_reach':
            if (event_data?.level && event_data.level >= condition.level) {
              shouldAward = true;
            }
            break;

          case 'xp_total':
            if (event_data?.xp_total && event_data.xp_total >= condition.amount) {
              shouldAward = true;
            }
            break;

          case 'trades_complete':
            if (event_data?.trades_count && event_data.trades_count >= condition.count) {
              shouldAward = true;
            }
            break;

          case 'referrals':
            if (event_data?.referrals_count && event_data.referrals_count >= condition.count) {
              shouldAward = true;
            }
            break;

          case 'gear_collected':
            if (event_data?.gear_count && event_data.gear_count >= condition.count) {
              shouldAward = true;
            }
            break;
        }

        if (shouldAward) {
          console.log(`[Award Achievement] Awarding achievement: ${achievement.name} to user ${user_id}`);
          
          // Award the achievement
          const { error: insertError } = await supabaseClient
            .from('user_achievements')
            .insert({
              user_id,
              achievement_id: achievement.id,
              awarded_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error(`[Award Achievement] Error inserting achievement ${achievement.id}:`, insertError);
            continue;
          }

          // Award XP if applicable
          if (achievement.xp_reward > 0) {
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('xp_points')
              .eq('id', user_id)
              .single();

            if (profile) {
              await supabaseClient
                .from('profiles')
                .update({ xp_points: (profile.xp_points || 0) + achievement.xp_reward })
                .eq('id', user_id);

              console.log(`[Award Achievement] Awarded ${achievement.xp_reward} XP to user ${user_id}`);
            }
          }

          newlyAwarded.push({
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            rarity: achievement.rarity,
            xp_reward: achievement.xp_reward,
            cinematic_id: achievement.cinematic_id,
          });
        }
      }
    }

    console.log(`[Award Achievement] Awarded ${newlyAwarded.length} new achievements to user ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        awarded_count: newlyAwarded.length,
        achievements: newlyAwarded,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Award Achievement] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
