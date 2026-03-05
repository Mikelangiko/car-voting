"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CarRow = {
  id: number;
  name: string;
  year: number | null;
  points: number;
};

type ProtocolRow = {
  expert: string;
  first: string;
  second: string;
  third: string;
  created_at?: string;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { status: "error", error: text || `HTTP ${res.status}` };
  }
}

export default function ResultsPage() {
  const [cars, setCars] = useState<CarRow[]>([]);
  const [protocol, setProtocol] = useState<ProtocolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function refresh() {
    setLoading(true);
    setMsg("");

    try {
      const [resResults, resProtocol] = await Promise.all([
        fetch("/api/results", { cache: "no-store" }),
        fetch("/api/protocol", { cache: "no-store" }),
      ]);

      const dataResults = await safeJson(resResults);
      const dataProtocol = await safeJson(resProtocol);

      if (!resResults.ok) {
        setCars([]);
        setMsg(`Помилка /api/results: ${dataResults?.error || resResults.status}`);
      } else {
        setCars(Array.isArray(dataResults) ? dataResults : []);
      }

      if (!resProtocol.ok) {
        setProtocol([]);
        setMsg((prev) =>
          prev
            ? prev + ` | Помилка /api/protocol: ${dataProtocol?.error || resProtocol.status}`
            : `Помилка /api/protocol: ${dataProtocol?.error || resProtocol.status}`
        );
      } else {
        setProtocol(Array.isArray(dataProtocol?.protocol) ? dataProtocol.protocol : []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <main style={{ maxWidth: 1050, margin: "24px auto", padding: 16, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Результати голосування</h1>
          <p style={{ marginTop: 6, color: "#666" }}>
            Протокол + рейтинг. Дані беруться з Supabase.
          </p>
          <p style={{ marginTop: 6 }}>
            <Link href="/" style={{ textDecoration: "underline" }}>← До голосування</Link>
          </p>
        </div>

        <button
          onClick={refresh}
          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Оновити
        </button>
      </header>

      {msg && (
        <p style={{ marginTop: 12, padding: 10, border: "1px solid #ddd", borderRadius: 12 }}>
          {msg}
        </p>
      )}

      {/* ПРОТОКОЛ */}
      <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Протокол голосування</h2>
        <p style={{ color: "#667", marginTop: 6 }}>Показано анонімно у вигляді псевдоніма експерта.</p>

        {loading ? (
          <p>Завантаження…</p>
        ) : protocol.length === 0 ? (
          <p>Поки що немає голосів.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>#</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Експерт</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>1 місце</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>2 місце</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>3 місце</th>
              </tr>
            </thead>
            <tbody>
              {protocol.map((p, idx) => (
                <tr key={p.expert + idx}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{idx + 1}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2", fontFamily: "monospace" }}>{p.expert}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{p.first || ""}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{p.second || ""}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{p.third || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* РЕЙТИНГ */}
      <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Рейтинг (відсортовано за балами)</h2>

        {loading ? (
          <p>Завантаження…</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Місце</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Авто</th>
                <th style={{ width: 90, padding: 10, borderBottom: "1px solid #eee" }}>Бали</th>
              </tr>
            </thead>
            <tbody>
              {cars.map((c, idx) => (
                <tr key={c.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{idx + 1}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>
                    {c.name} {c.year ? `(${c.year})` : ""}
                  </td>
                  <td style={{ padding: 10, textAlign: "center", borderBottom: "1px solid #f2f2f2" }}>
                    <b>{c.points}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}