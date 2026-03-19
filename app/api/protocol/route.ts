import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CarRow = {
  id: number;
  name: string;
  year: number | null;
};

type VoteRow = {
  voter_token: string;
  car_id: number;
  rank: number;
  created_at: string | null;
};

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
    const [{ data: cars, error: carsError }, { data: votes, error: votesError }] = await Promise.all([
      supabase.from("cars").select("id, name, year"),
      supabase.from("votes").select("voter_token, car_id, rank, created_at").order("created_at", { ascending: true }),
    ]);

    if (carsError) {
      return Response.json({ status: "error", error: carsError.message }, { status: 500 });
    }

    if (votesError) {
      return Response.json({ status: "error", error: votesError.message }, { status: 500 });
    }

    const carMap = new Map<number, string>();

    for (const car of (cars ?? []) as CarRow[]) {
      carMap.set(car.id, `${car.name}${car.year ? ` (${car.year})` : ""}`);
    }

    const protocolMap = new Map<string, ProtocolRow>();

    for (const vote of (votes ?? []) as VoteRow[]) {
      const token = String(vote.voter_token);
      const rank = Number(vote.rank);
      const createdAt = String(vote.created_at ?? "");
      const carLabel = carMap.get(Number(vote.car_id)) ?? `Авто ${String(vote.car_id)}`;

      if (!protocolMap.has(token)) {
        protocolMap.set(token, {
          expert: expertAlias(token),
          first: "",
          second: "",
          third: "",
          created_at: createdAt,
        });
      }

      const item = protocolMap.get(token)!;

      if (rank === 1) item.first = carLabel;
      if (rank === 2) item.second = carLabel;
      if (rank === 3) item.third = carLabel;

      if (createdAt && (!item.created_at || createdAt < item.created_at)) {
        item.created_at = createdAt;
      }
    }

    const protocol = Array.from(protocolMap.values()).sort((a, b) =>
      (a.created_at || "").localeCompare(b.created_at || "")
    );

    return Response.json({ status: "ok", protocol });
  } catch (e: unknown) {
    return Response.json(
      { status: "error", error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
