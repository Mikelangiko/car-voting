import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {

  const body = await req.json()

  const { voterToken, first, second, third } = body

  const { data, error } = await supabase.from("votes").insert([
    { voter_token: voterToken, car_id: first, rank: 1 },
    { voter_token: voterToken, car_id: second, rank: 2 },
    { voter_token: voterToken, car_id: third, rank: 3 }
  ])

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ status: "ok" })
}