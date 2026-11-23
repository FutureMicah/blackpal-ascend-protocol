import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AwardRequest {
  user_id: string;
  event_type: 'profile_complete' | 'payment_complete' | 'level_reach' | 'xp_total' | 'trades_complete' | 'referrals' | 'gear_collected' | 'vault_first_access' | 'streak_milestone';
  event_data?: {
    level?: number;
    xp_total?: number;
    trades_count?: number;
    referrals_count?: number;
    gear_count?: number;
    streak_days?: number;
    streak?: number;
  };
}

// Deterministic uuid from a string (md5-shaped, same trick the DB
// triggers use) so a (user, milestone) XP grant dedupes in xp_ledger.
function md5UUID(s: string): string {
  // SHA-256 hex, first 32 chars -> uuid v4 shape. Dedupe only needs
  // stability, not cryptographic strength.
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  const raw = hex + hex2;
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-4${raw.slice(13, 16)}-a${raw.slice(17, 20)}-${raw.slice(20, 32)}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- AuthN: validate the caller's JWT ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = authData.user.id;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const body: AwardRequest = await req.json();
    const { event_type, event_data } = body;
    // SECURITY: derive user_id from the verified JWT, never trust the body.
    const user_id = callerId;

    if (!event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing event_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Award Achievement] Checking achievements for user ${user_id}, event: ${event_type}`, event_data);

    // Accumulates every newly awarded item in this request (login-streak
    // XP below and table achievements further down).
    const newlyAwarded: any[] = [];

    // Login-streak XP: modest milestone awards on top of the 2 XP daily
    // claim. Amounts are decided server-side from the profile's actual
    // streak (not from client event_data), and every grant goes through
    // award_xp_once with a deterministic source_id, so re-sending the
    // same streak can never print XP twice.
    //
    //   day 7 -> 10 XP, day 30 -> 30 XP, day 100 -> 50 XP, day 365 -> 100 XP
    //
    // These stay below the contest participation (20 XP), contest pass
    // (100 XP) and win-streak milestone (150-1000 XP) awards: login streak
    // is the easy, low-value source by design.
    if (event_type === 'streak_milestone') {
      const MILESTONES: Record<number, number> = {
        7: 10,
        30: 30,
        100: 50,
        365: 100,
      };
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('streak_days')
        .eq('id', user_id)
        .single();
      const streak = Math.max(0, Number((profile as any)?.streak_days ?? event_data?.streak ?? 0) || 0);
      const ms = MILESTONES[streak];
      if (ms !== undefined) {
        // deterministic source_id per (user, milestone day) so retries dedupe
        const milestoneSourceId = md5UUID(`${user_id}:${streak}:login_streak`);
        const { data: xpData, error: xpError } = await supabaseClient.rpc('award_xp_once', {
          p_user_id: user_id,
          p_amount: ms,
          p_source: 'login_streak_milestone',
          p_source_id: milestoneSourceId,
          p_reason: `login streak ${streak} days`,
        });
        if (xpError) {
          console.error('[Award Achievement] login streak award_xp_once failed:', xpError);
        } else if (!(xpData as any)?.already_awarded) {
          newlyAwarded.push({
            id: milestoneSourceId,
            name: `Login Streak ${streak} days`,
            description: `${ms} XP for reaching a ${streak}-day login streak`,
            icon: '🔥',
            rarity: streak >= 365 ? 'legendary' : streak >= 100 ? 'epic' : streak >= 30 ? 'rare' : 'common',
            xp_reward: ms,
            cinematic_id: null,
            combo: null,
          });
        }
      }
    }

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
      .select('achievement_id, awarded_at')
      .eq('user_id', user_id);

    if (userAchError) {
      console.error('[Award Achievement] Error fetching user achievements:', userAchError);
      throw userAchError;
    }

    const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);
    // (newlyAwarded is declared near the top so the login-streak block
    // above can append to it too)
    const recentAchievements = userAchievements
      ?.filter(ua => {
        const awardedTime = new Date(ua.awarded_at).getTime();
        const now = Date.now();
        return (now - awardedTime) < 3600000; // Within last hour
      })
      .map(ua => ua.achievement_id) || [];

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

          case 'streak_milestone':
            if (event_data?.streak_days && event_data.streak_days >= condition.streak_days) {
              shouldAward = true;
            }
            break;
        }

        if (shouldAward) {
          console.log(`[Award Achievement] Awarding achievement: ${achievement.name} to user ${user_id}`);
          
          // Check for combo (multiple achievements in same category within an hour)
          const relatedAchievements = achievements?.filter(a => 
            a.category === achievement.category && 
            recentAchievements.includes(a.id)
          ) || [];
          
          const isCombo = relatedAchievements.length >= 2;
          const comboSize = isCombo ? relatedAchievements.length + 1 : null;
          const bonusXP = isCombo ? Math.floor(achievement.xp_reward * 0.5 * comboSize!) : 0;
          
          // Award the achievement
          const { error: insertError } = await supabaseClient
            .from('user_achievements')
            .insert({
              user_id,
              achievement_id: achievement.id,
              awarded_at: new Date().toISOString(),
              part_of_combo: isCombo,
              combo_size: comboSize,
            });

          if (insertError) {
            console.error(`[Award Achievement] Error inserting achievement ${achievement.id}:`, insertError);
            continue;
          }
          
          // Update streak
          const { data: streakData } = await supabaseClient.rpc('update_achievement_streak', {
            user_id_param: user_id
          });
          
          console.log(`[Award Achievement] Updated streak for user ${user_id}: ${streakData}`);
          
          if (isCombo) {
            console.log(`[Award Achievement] COMBO! ${comboSize}x combo in ${achievement.category}, awarding ${bonusXP} bonus XP`);
          }

          // Award XP if applicable (including bonus). Atomic and
          // idempotent: award_xp_once writes the xp_ledger row and
          // increments xp_points together, so concurrent awards cannot
          // overwrite each other and retries credit nothing extra.
          const totalXP = achievement.xp_reward + bonusXP;
          if (totalXP > 0) {
            const { data: xpData, error: xpError } = await supabaseClient.rpc('award_xp_once', {
              p_user_id: user_id,
              p_amount: totalXP,
              p_source: 'achievement',
              p_source_id: achievement.id,
              p_reason: achievement.name,
            });
            if (xpError) {
              console.error('[Award Achievement] award_xp_once failed:', xpError);
            } else if ((xpData as any)?.already_awarded) {
              console.log(`[Award Achievement] XP already awarded for ${achievement.id} to ${user_id}, skipping`);
            } else {
              console.log(`[Award Achievement] Awarded ${totalXP} XP to user ${user_id} (base: ${achievement.xp_reward}, bonus: ${bonusXP})`);
            }
          }

          newlyAwarded.push({
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            rarity: achievement.rarity,
            xp_reward: totalXP,
            cinematic_id: achievement.cinematic_id,
            combo: isCombo ? {
              size: comboSize,
              bonus_xp: bonusXP,
              category: achievement.category
            } : null,
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
