"use client";

import { useEffect, useMemo, useState } from "react";

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

function getVoterToken(): string {
  const key = "car_vote_token_v1";
  let t = localStorage.getItem(key);
  if (!t) {
    t = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
    localStorage.setItem(key, t);
  }
  return t;
}

export default function Page() {
  const [cars, setCars] = useState<CarRow[]>([]);
  const [protocol, setProtocol] = useState<ProtocolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // вибір трійки: [1 місце, 2 місце, 3 місце]
  const [top, setTop] = useState<(number | null)[]>([null, null, null]);

  const canVote = useMemo(() => top.every((x) => x !== null) && new Set(top).size === 3, [top]);

  async function refresh() {
    setLoading(true);

    const [resResults, resProtocol] = await Promise.all([fetch("/api/results"), fetch("/api/protocol")]);

    const dataResults = await resResults.json();
    const dataProtocol = await resProtocol.json();

    setCars(Array.isArray(dataResults) ? dataResults : []);
    setProtocol(Array.isArray(dataProtocol?.protocol) ? dataProtocol.protocol : []);

    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  function setRank(rankIndex: 0 | 1 | 2, carId: number) {
    setMsg("");
    setTop((prev) => {
      const next = [...prev];

      // якщо це авто вже вибране в іншому місці — прибираємо звідти
      for (let i = 0; i < 3; i++) {
        if (i !== rankIndex && next[i] === carId) next[i] = null;
      }

      // перемикач: якщо натиснули те саме — зняти вибір
      next[rankIndex] = next[rankIndex] === carId ? null : carId;

      return next;
    });
  }

  function getRankLabel(carId: number) {
    const idx = top.findIndex((x) => x === carId);
    if (idx === 0) return "1 місце";
    if (idx === 1) return "2 місце";
    if (idx === 2) return "3 місце";
    return "";
  }

  async function vote() {
    setMsg("");
    if (!canVote) {
      setMsg("Обери 3 різні авто для 1/2/3 місця.");
      return;
    }

    const voterToken = getVoterToken();
    const [first, second, third] = top as number[];

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterToken, first, second, third }),
    });

    const j = await res.json();

    if (j.status === "ok") setMsg("Голос зараховано ✅");
    else if (j.status === "already_voted") setMsg("Ти вже голосував з цього браузера 🙂");
    else setMsg("Помилка: " + (j.error || "unknown"));

    await refresh();
  }

  return (
    <main style={{ maxWidth: 1050, margin: "24px auto", padding: 16, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Голосування за найкращий спорткар</h1>
          <p style={{ marginTop: 6, color: "#666" }}>
            Обери ТОП-3. Анонімно, без логіну. Бали: 1 місце = 3, 2 = 2, 3 = 1.
          </p>
        </div>
        <button onClick={refresh} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}>
          Оновити дані
        </button>
      </header>

      {/* БЮЛЕТЕНЬ */}
      <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Бюлетень (ТОП-3)</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{i === 0 ? "1 місце" : i === 1 ? "2 місце" : "3 місце"}</div>
              <div style={{ color: "#666" }}>{top[i] ? cars.find((c) => c.id === top[i])?.name : "Не обрано"}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={vote}
            disabled={!canVote}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #ccc",
              cursor: canVote ? "pointer" : "not-allowed",
            }}
          >
            Проголосувати
          </button>

          {msg && <span>{msg}</span>}
        </div>
      </section>

      {/* СПИСОК АВТО */}
      <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Список авто</h2>

        {loading ? (
          <p>Завантаження…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {cars.map((c) => {
              const badge = getRankLabel(c.id);
              return (
                <div key={c.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{c.name}</div>
                      <div style={{ color: "#666" }}>{c.year ?? ""}</div>
                    </div>

                    {/* ✅ Прибрали "Бали" з індивідуальних карток */}
                  </div>

                  {badge && (
                    <div style={{ marginTop: 8, display: "inline-block", padding: "4px 10px", borderRadius: 999, border: "1px solid #ddd" }}>
                      ✅ Обрано: {badge}
                    </div>
                  )}

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setRank(0, c.id)} style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}>
                      1 місце
                    </button>
                    <button onClick={() => setRank(1, c.id)} style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}>
                      2 місце
                    </button>
                    <button onClick={() => setRank(2, c.id)} style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}>
                      3 місце
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ПРОТОКОЛ ГОЛОСУВАННЯ (перед рейтингом) */}
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
                <tr key={p.expert}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{idx + 1}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2", fontFamily: "monospace" }}>
                    {p.expert}
                  </td>
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