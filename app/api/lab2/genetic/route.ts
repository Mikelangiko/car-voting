import { createClient } from "@supabase/supabase-js";

import { runGeneticAlgorithm, type RankedCar } from "@/lib/lab2/genetic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CarDbRow = {
  id: number;
  name: string;
  year: number | null;
};

type VoteDbRow = {
  car_id: number;
  rank: number;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seedParam = searchParams.get("seed");
    const parsedSeed = seedParam ? Number(seedParam) : undefined;
    const seedOverride = Number.isFinite(parsedSeed) ? parsedSeed : undefined;

    const [{ data: cars, error: carsError }, { data: votes, error: votesError }] = await Promise.all([
      supabase.from("cars").select("*"),
      supabase.from("votes").select("car_id, rank"),
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

    const score: Record<number, number> = {};

    for (const car of (cars ?? []) as CarDbRow[]) {
      score[car.id] = 0;
    }

    for (const vote of (votes ?? []) as VoteDbRow[]) {
      const carId = Number(vote.car_id);
      const rank = Number(vote.rank);

      if (!(carId in score)) continue;

      if (rank === 1) score[carId] += 3;
      if (rank === 2) score[carId] += 2;
      if (rank === 3) score[carId] += 1;
    }

    const rankedCars: RankedCar[] = ((cars ?? []) as CarDbRow[])
      .map((car) => ({
        id: car.id,
        name: car.name,
        year: car.year ?? null,
        points: score[car.id] ?? 0,
      }))
      .sort((a, b) => b.points - a.points || a.id - b.id);

    const genetic = runGeneticAlgorithm(rankedCars, seedOverride);

    return Response.json({
      status: "ok",
      populationSize: genetic.generatedRatings.length,
      importanceTable: genetic.importanceTable,
      generatedRatings: genetic.generatedRatings,
    });
  } catch (e: unknown) {
    return Response.json(
      { status: "error", error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
