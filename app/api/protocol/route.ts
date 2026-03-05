import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProtocolRow = {
  expert: string;       // ✅ замість voter_token
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
      .from("votes")
      .select("voter_token, rank, created_at, cars(name)")
      .order("created_at", { ascending: true });

    if (error) {
      return Response.json({ status: "error", error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as any[];

    // ключ мапи = token (щоб групувати), але у відповіді його НЕ віддаємо
    const map = new Map<string, ProtocolRow>();

    for (const r of rows) {
      const token = String(r.voter_token);
      const rank = Number(r.rank);
      const createdAt = String(r.created_at);

      // cars може бути об'єктом або масивом — підтримуємо обидва варіанти
      let carName = "";
      if (Array.isArray(r.cars)) carName = r.cars?.[0]?.name ?? "";
      else carName = r.cars?.name ?? "";

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

      if (rank === 1) item.first = carName;
      if (rank === 2) item.second = carName;
      if (rank === 3) item.third = carName;

      // найраніший час як час голосування
      if (createdAt < item.created_at) item.created_at = createdAt;
    }

    const protocol = Array.from(map.values()).sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    );

    return Response.json({ status: "ok", protocol });
  } catch (e: any) {
    return Response.json(
      { status: "error", error: String(e?.message || e) },
      { status: 500 }
    );
  }
}