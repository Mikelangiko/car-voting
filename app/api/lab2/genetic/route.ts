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

function createRng(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seedParam = searchParams.get("seed");
    const parsedSeed = seedParam ? Number(seedParam) : undefined;
    const seedOverride = Number.isFinite(parsedSeed) ? parsedSeed : Date.now();

    const { data: cars, error: carsError } = await supabase.from("cars").select("*");

    if (carsError) {
      return Response.json(
        { status: "error", error: carsError.message },
        { status: 500 }
      );
    }

    const rng = createRng(seedOverride);

    const rankedCars: RankedCar[] = ((cars ?? []) as CarDbRow[])
      .map((car) => ({
        id: car.id,
        name: car.name,
        year: car.year ?? null,
        points: Math.round((20 + rng() * 80) * 100) / 100,
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
