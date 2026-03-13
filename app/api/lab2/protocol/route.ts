import crypto from "crypto";
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

const HEURISTIC_MAP = new Map(
  HEURISTICS.map((h) => [h.id, h.code])
);


type ProtocolRow = {
  expert: string;
  first: string;
  second: string;
  third: string;
  created_at: string;
};

function expertAlias(token: string) {
  const hex = crypto.createHash("sha256").update(token).digest("hex");
  return `Експерт ${hex.slice(0, 6).toUpperCase()}`;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("heuristic_votes")
      .select("voter_token, heuristic_id, rank, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      return Response.json(
        { status: "error", error: error.message },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as any[];
    const map = new Map<string, ProtocolRow>();

    for (const r of rows) {
      const token = String(r.voter_token);
      const rank = Number(r.rank);
      const createdAt = String(r.created_at ?? "");
      const heuristicText =
        HEURISTIC_MAP.get(Number(r.heuristic_id)) ??
        `Евристика ${String(r.heuristic_id)}`;

      if (!map.has(token)) {
        map.set(token, {
          expert: expertAlias(token),
          first: "",
          second: "",
          third: "",
          created_at: createdAt,
        });
      }

      const item = map.get(token)!;

      if (rank === 1) item.first = heuristicText;
      if (rank === 2) item.second = heuristicText;
      if (rank === 3) item.third = heuristicText;

      if (createdAt && (!item.created_at || createdAt < item.created_at)) {
        item.created_at = createdAt;
      }
    }

    const protocol = Array.from(map.values()).sort((a, b) =>
      (a.created_at || "").localeCompare(b.created_at || "")
    );

    return Response.json({ status: "ok", protocol });
  } catch (e: any) {
    return Response.json(
      { status: "error", error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
