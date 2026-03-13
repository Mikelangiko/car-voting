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

export async function GET() {
  try {
    const { data: votes, error } = await supabase
      .from("heuristic_votes")
      .select("heuristic_id, rank");

    if (error) {
      return Response.json(
        { status: "error", error: error.message },
        { status: 500 }
      );
    }

    const score: Record<number, number> = {};
    for (const h of HEURISTICS) score[h.id] = 0;

    for (const v of votes ?? []) {
      const heuristicId = Number(v.heuristic_id);
      const rank = Number(v.rank);

      if (!(heuristicId in score)) continue;

      if (rank === 1) score[heuristicId] += 3;
      if (rank === 2) score[heuristicId] += 2;
      if (rank === 3) score[heuristicId] += 1;
    }

    const heuristics = HEURISTICS.map((h) => ({
      ...h,
      points: score[h.id] ?? 0,
    })).sort((a, b) => b.points - a.points || a.id - b.id);

    return Response.json({ status: "ok", heuristics });
  } catch (e: any) {
    return Response.json(
      { status: "error", error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
