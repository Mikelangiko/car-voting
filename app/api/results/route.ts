import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {

  const { data: cars } = await supabase
    .from("cars")
    .select("*")

  const { data: votes } = await supabase
    .from("votes")
    .select("car_id, rank")

  const score: any = {}

  cars?.forEach(c => score[c.id] = 0)

  votes?.forEach(v => {
    if (v.rank === 1) score[v.car_id] += 3
    if (v.rank === 2) score[v.car_id] += 2
    if (v.rank === 3) score[v.car_id] += 1
  })

  const result = cars?.map(c => ({
    ...c,
    points: score[c.id]
  })).sort((a,b)=>b.points-a.points)

  return Response.json(result)
}