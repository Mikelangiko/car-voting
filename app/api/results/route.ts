import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type CarRow = {
  id: number
  name: string
  year: number | null
}

type VoteRow = {
  car_id: number
  rank: number
}

export async function GET() {
  const { data: cars } = await supabase
    .from("cars")
    .select("*")

  const { data: votes } = await supabase
    .from("votes")
    .select("car_id, rank")

  const score: Record<number, number> = {}
  const stats: Record<number, { firstVotes: number; secondVotes: number; thirdVotes: number }> = {}

  ;(cars as CarRow[] | null)?.forEach((car) => {
    score[car.id] = 0
    stats[car.id] = { firstVotes: 0, secondVotes: 0, thirdVotes: 0 }
  })

  ;(votes as VoteRow[] | null)?.forEach((vote) => {
    if (vote.rank === 1) {
      score[vote.car_id] += 3
      stats[vote.car_id].firstVotes += 1
    }
    if (vote.rank === 2) {
      score[vote.car_id] += 2
      stats[vote.car_id].secondVotes += 1
    }
    if (vote.rank === 3) {
      score[vote.car_id] += 1
      stats[vote.car_id].thirdVotes += 1
    }
  })

  const result = (cars as CarRow[] | null)?.map((car) => ({
    ...car,
    points: score[car.id] ?? 0,
    firstVotes: stats[car.id]?.firstVotes ?? 0,
    secondVotes: stats[car.id]?.secondVotes ?? 0,
    thirdVotes: stats[car.id]?.thirdVotes ?? 0,
    totalVotes:
      (stats[car.id]?.firstVotes ?? 0) +
      (stats[car.id]?.secondVotes ?? 0) +
      (stats[car.id]?.thirdVotes ?? 0),
  })).sort((a, b) => b.points - a.points || a.id - b.id)

  return Response.json(result)
}
