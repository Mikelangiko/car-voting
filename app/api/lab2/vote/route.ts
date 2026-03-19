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

const HEURISTIC_IDS = new Set(HEURISTICS.map((h) => h.id));

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { voterToken, first, second, third } = body ?? {};

    if (!voterToken || first == null || second == null || third == null) {
      return Response.json(
        { status: "error", error: "Не всі поля заповнені" },
        { status: 400 }
      );
    }

    const ids = [Number(first), Number(second), Number(third)];

    if (ids.some((id) => !HEURISTIC_IDS.has(id))) {
      return Response.json(
        { status: "error", error: "Некоректний ідентифікатор евристики" },
        { status: 400 }
      );
    }

    if (new Set(ids).size !== 3) {
      return Response.json(
        { status: "error", error: "Потрібно вибрати 3 різні евристики" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("heuristic_votes").insert([
      { voter_token: String(voterToken), heuristic_id: ids[0], rank: 1 },
      { voter_token: String(voterToken), heuristic_id: ids[1], rank: 2 },
      { voter_token: String(voterToken), heuristic_id: ids[2], rank: 3 },
    ]);

    if (error) {
      return Response.json(
        { status: "error", error: error.message },
        { status: 500 }
      );
    }

    return Response.json({ status: "ok" });
  } catch (e: any) {
    return Response.json(
      { status: "error", error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
