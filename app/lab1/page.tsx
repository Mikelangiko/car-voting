"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CarRow = {
  id: number;
  name: string;
  year: number | null;
  points: number;
};

function getVoterToken(): string {
  const key = "car_vote_token_v1";
  let t = localStorage.getItem(key);
  if (!t) {
    t = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now();
    localStorage.setItem(key, t);
  }
  return t;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { status: "error", error: text || `HTTP ${res.status}` };
  }
}

export default function Lab1Page() {
  const [cars, setCars] = useState<CarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [top, setTop] = useState<(number | null)[]>([null, null, null]);

  const canVote = useMemo(() => top.every((x) => x !== null) && new Set(top).size === 3, [top]);

  async function refresh() {
    setLoading(true);
    setMsg("");

    try {
      const resResults = await fetch("/api/results", { cache: "no-store" });
      const dataResults = await safeJson(resResults);

      if (!resResults.ok) {
        setCars([]);
        setMsg(`Помилка /api/results: ${dataResults?.error || resResults.status}`);
      } else {
        setCars(Array.isArray(dataResults) ? dataResults : []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshSilent() {
    const resResults = await fetch("/api/results", { cache: "no-store" });
    const dataResults = await safeJson(resResults);

    if (resResults.ok) {
      setCars(Array.isArray(dataResults) ? dataResults : []);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function setRank(rankIndex: 0 | 1 | 2, carId: number) {
    setMsg("");
    setTop((prev) => {
      const next = [...prev];
      for (let i = 0; i < 3; i++) {
        if (i !== rankIndex && next[i] === carId) next[i] = null;
      }
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
      setMsg("Обери 3 різні об’єкти для 1, 2 та 3 місця.");
      return;
    }

    const voterToken = getVoterToken();
    const [first, second, third] = top as number[];

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterToken, first, second, third }),
    });

    const j = await safeJson(res);

    if (j?.status === "ok") {
      setMsg("Голос зараховано ✅");
    } else if (j?.status === "already_voted") {
      setMsg("Ти вже голосував з цього браузера 🙂");
    } else {
      setMsg("Помилка: " + (j?.error || "unknown"));
    }

    await refreshSilent();
  }

  return (
    <main style={{ maxWidth: 1050, margin: "24px auto", padding: 16, fontFamily: "system-ui" }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Лабораторна 1 — голосування за об’єкти</h1>
          <p style={{ marginTop: 6, color: "#666" }}>Обери ТОП-3.</p>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/"
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #ccc",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              ← Головне меню
            </Link>

            <Link
              href="/results"
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #ccc",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              Перейти до результатів →
            </Link>
          </div>
        </div>

        <button
          onClick={refresh}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Оновити список
        </button>
      </header>

      {msg && (
        <p style={{ marginTop: 12, padding: 10, border: "1px solid #ddd", borderRadius: 12 }}>
          {msg}
        </p>
      )}

      <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Бюлетень (ТОП-3)</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                {i === 0 ? "1 місце" : i === 1 ? "2 місце" : "3 місце"}
              </div>
              <div style={{ color: "#666" }}>
                {top[i] ? cars.find((c) => c.id === top[i])?.name : "Не обрано"}
              </div>
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
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Список об’єктів</h2>

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
                  </div>

                  {badge && (
                    <div
                      style={{
                        marginTop: 8,
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid #ddd",
                      }}
                    >
                      ✅ Обрано: {badge}
                    </div>
                  )}

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => setRank(0, c.id)}
                      style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
                    >
                      1 місце
                    </button>
                    <button
                      onClick={() => setRank(1, c.id)}
                      style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
                    >
                      2 місце
                    </button>
                    <button
                      onClick={() => setRank(2, c.id)}
                      style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
                    >
                      3 місце
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
