// Daily.co room + meeting token minter
// Creates an ephemeral room (or returns existing) and signs a short-lived token.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const DAILY_API = 'https://api.daily.co/v1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''))
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401)

    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY')
    if (!DAILY_API_KEY) return json({ error: 'DAILY_API_KEY not configured' }, 500)

    const body = await req.json().catch(() => ({}))
    const rawRoom = String(body.room_name || '').trim()
    if (!rawRoom || !/^[a-zA-Z0-9_-]{3,60}$/.test(rawRoom)) {
      return json({ error: 'Invalid room_name' }, 400)
    }
    const isHost = !!body.is_host
    const userName = String(body.user_name || 'Trader').slice(0, 60)

    // Ensure room exists (idempotent) and capture its real URL
    let roomUrl: string | null = null
    const getRoom = await fetch(`${DAILY_API}/rooms/${rawRoom}`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    })
    if (getRoom.status === 404) {
      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 4 // 4h room TTL
      const create = await fetch(`${DAILY_API}/rooms`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${DAILY_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rawRoom,
          privacy: 'private',
          properties: {
            exp,
            enable_screenshare: true,
            enable_chat: true,
            enable_knocking: false,
            start_video_off: false,
            start_audio_off: true,
            max_participants: 200,
          },
        }),
      })
      if (!create.ok) {
        const t = await create.text()
        return json({ error: 'create_failed', detail: t }, 500)
      }
      const created = await create.json()
      roomUrl = created.url
    } else if (!getRoom.ok) {
      const t = await getRoom.text()
      return json({ error: 'lookup_failed', detail: t }, 500)
    } else {
      const existing = await getRoom.json()
      roomUrl = existing.url
    }

    // Mint meeting token (90 min)
    const tok = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${DAILY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: {
          room_name: rawRoom,
          user_name: userName,
          is_owner: isHost,
          exp: Math.floor(Date.now() / 1000) + 60 * 90,
        },
      }),
    })
    if (!tok.ok) {
      const t = await tok.text()
      return json({ error: 'token_failed', detail: t }, 500)
    }
    const { token } = await tok.json()
    const url = `${roomUrl}?t=${token}`
    return json({ url, room: rawRoom })
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
