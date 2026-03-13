import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const HEURISTICS = [
  { id: 1, code: "E1", title: "Участь в одному множинному порівнянні на 3 місці" },
  { id: 2, code: "E2", title: "Участь в одному множинному порівнянні на 2 місці" },
  { id: 3, code: "E3", title: "Участь в одному множинному порівнянні на 1 місці" },
  { id: 4, code: "E4", title: "Участь у двох множинних порівняннях на 3 місці" },
  { id: 5, code: "E5", title: "Участь в одному порівнянні на 3 місці та ще в одному — на 2 місці" },
  { id: 6, code: "E6", title: "Об’єкт жодного разу не посідав 1 місце" },
  { id: 7, code: "E7", title: "Об’єкт згадувався лише один раз незалежно від позиції" },
];

const CORE_SIZE = 15;
const TARGET_SIZE = 10;

type Car = {
  id: number;
  name: string;
  year: number | null;
  points: number;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  mentions: number;
};

function applyHeuristic(code: string, items: Car[]) {
  switch (code) {
    case "E1":
      return items.filter((x) => x.thirdCount !== 1);

    case "E2":
      return items.filter((x) => x.secondCount !== 1);

    case "E3":
      return items.filter((x) => x.firstCount !== 1);

    case "E4":
      return items.filter((x) => x.thirdCount < 2);

    case "E5":
      return items.filter((x) => !(x.thirdCount >= 1 && x.secondCount >= 1));

    case "E6":
      return items.filter((x) => x.firstCount > 0);

    case "E7":
      return items.filter((x) => x.mentions > 1);

    default:
      return items;
  }
}

export async function GET() {
  try {
    const [
      { data: cars, error: carsError },
      { data: votes, error: votesError },
      { data: heuristicVotes, error: heuristicVotesError },
    ] = await Promise.all([
      supabase.from("cars").select("*"),
      supabase.from("votes").select("car_id, rank"),
      supabase.from("heuristic_votes").select("heuristic_id, rank"),
    ]);

    if (carsError) {
      return Response.json(
        { status: "error", error: carsError.message },
        { status: 500 }
      );
    }

    if (votesError) {
      return Response.json(
        { status: "error", error: votesError.message },
        { status: 500 }
      );
    }

    if (heuristicVotesError) {
      return Response.json(
        { status: "error", error: heuristicVotesError.message },
        { status: 500 }
      );
    }

    const score: Record<number, number> = {};
    const stats: Record<
      number,
      { firstCount: number; secondCount: number; thirdCount: number }
    > = {};

    for (const c of cars ?? []) {
      score[c.id] = 0;
      stats[c.id] = { firstCount: 0, secondCount: 0, thirdCount: 0 };
    }

    for (const v of votes ?? []) {
      const carId = Number(v.car_id);
      const rank = Number(v.rank);

      if (!(carId in score)) continue;

      if (rank === 1) {
        score[carId] += 3;
        stats[carId].firstCount += 1;
      }
      if (rank === 2) {
        score[carId] += 2;
        stats[carId].secondCount += 1;
      }
      if (rank === 3) {
        score[carId] += 1;
        stats[carId].thirdCount += 1;
      }
    }

    const rankedCars: Car[] = (cars ?? [])
      .map((c: any) => {
        const s = stats[c.id] ?? { firstCount: 0, secondCount: 0, thirdCount: 0 };
        return {
          ...c,
          points: score[c.id] ?? 0,
          firstCount: s.firstCount,
          secondCount: s.secondCount,
          thirdCount: s.thirdCount,
          mentions: s.firstCount + s.secondCount + s.thirdCount,
        };
      })
      .sort((a, b) => b.points - a.points || a.id - b.id);

    const initialCore = rankedCars.slice(0, Math.min(CORE_SIZE, rankedCars.length));

    const heuristicScore: Record<number, number> = {};
    for (const h of HEURISTICS) heuristicScore[h.id] = 0;

    for (const v of heuristicVotes ?? []) {
      const heuristicId = Number(v.heuristic_id);
      const rank = Number(v.rank);

      if (!(heuristicId in heuristicScore)) continue;

      if (rank === 1) heuristicScore[heuristicId] += 3;
      if (rank === 2) heuristicScore[heuristicId] += 2;
      if (rank === 3) heuristicScore[heuristicId] += 1;
    }

    const orderedHeuristics = HEURISTICS.map((h) => ({
      ...h,
      points: heuristicScore[h.id] ?? 0,
    })).sort((a, b) => b.points - a.points || a.id - b.id);

    let current = [...initialCore];
    const steps: Array<{
      code: string;
      title: string;
      before: number;
      after: number;
      removed: number;
    }> = [];

    for (const h of orderedHeuristics) {
      if (current.length <= TARGET_SIZE) break;

      const before = current.length;
      const next = applyHeuristic(h.code, current);

      current = next;
      steps.push({
        code: h.code,
        title: h.title,
        before,
        after: current.length,
        removed: before - current.length,
      });
    }

    const finalists = current.slice(0, TARGET_SIZE).map((x) => ({
      id: x.id,
      name: x.name,
      year: x.year,
      points: x.points,
      firstCount: x.firstCount,
      secondCount: x.secondCount,
      thirdCount: x.thirdCount,
      mentions: x.mentions,
    }));

    return Response.json({
      status: "ok",
      initialCoreSize: initialCore.length,
      targetSize: TARGET_SIZE,
      appliedHeuristics: orderedHeuristics,
      steps,
      finalists,
    });
  } catch (e: any) {
    return Response.json(
      { status: "error", error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
