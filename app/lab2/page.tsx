"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type HeuristicRow = {
  id: number;
  code: string;
  title: string;
  points?: number;
};

function getVoterToken(): string {
  const key = "heuristic_vote_token_v1";
  let t = localStorage.getItem(key);
  if (!t) {
    t = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now();
    localStorage.setItem(key, t);
  }
  return t;
}

function createBallotToken(): string {
  const browserToken = getVoterToken();
  const ballotId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${browserToken}:${ballotId}`;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { status: "error", error: text || `HTTP ${res.status}` };
  }
}

const FALLBACK_HEURISTICS: HeuristicRow[] = [
  { id: 1, code: "E1", title: "Участь в одному множинному порівнянні на 3 місці" },
  { id: 2, code: "E2", title: "Участь в одному множинному порівнянні на 2 місці" },
  { id: 3, code: "E3", title: "Участь в одному множинному порівнянні на 1 місці" },
  { id: 4, code: "E4", title: "Участь у двох множинних порівняннях на 3 місці" },
  { id: 5, code: "E5", title: "Участь в одному порівнянні на 3 місці та ще в одному — на 2 місці" },
  { id: 6, code: "E6", title: "Об’єкт жодного разу не посідав 1 місце" },
  { id: 7, code: "E7", title: "Об’єкт згадувався лише один раз незалежно від позиції" },
];

export default function Lab2Page() {
  const [heuristics, setHeuristics] = useState<HeuristicRow[]>(FALLBACK_HEURISTICS);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [top, setTop] = useState<(number | null)[]>([null, null, null]);

  const canVote = useMemo(() => top.every((x) => x !== null) && new Set(top).size === 3, [top]);

  async function refresh() {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/lab2/results", { cache: "no-store" });
      const data = await safeJson(res);

      if (!res.ok) {
        setHeuristics(FALLBACK_HEURISTICS);
        setMsg("Поки що використовується локальний список евристик.");
      } else {
        const rows = Array.isArray(data?.heuristics) ? data.heuristics : Array.isArray(data) ? data : [];
        setHeuristics(rows.length ? rows : FALLBACK_HEURISTICS);
      }
    } catch {
      setHeuristics(FALLBACK_HEURISTICS);
      setMsg("Поки що використовується локальний список евристик.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function setRank(rankIndex: 0 | 1 | 2, heuristicId: number) {
    setMsg("");
    setTop((prev) => {
      const next = [...prev];
      for (let i = 0; i < 3; i++) {
        if (i !== rankIndex && next[i] === heuristicId) next[i] = null;
      }
      next[rankIndex] = next[rankIndex] === heuristicId ? null : heuristicId;
      return next;
    });
  }

  function getRankLabel(heuristicId: number) {
    const idx = top.findIndex((x) => x === heuristicId);
    if (idx === 0) return "1 місце";
    if (idx === 1) return "2 місце";
    if (idx === 2) return "3 місце";
    return "";
  }

  async function vote() {
    setMsg("");

    if (!canVote) {
      setMsg("Обери 3 різні евристики для 1, 2 та 3 місця.");
      return;
    }

    const voterToken = createBallotToken();
    const [first, second, third] = top as number[];

    try {
      const res = await fetch("/api/lab2/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterToken, first, second, third }),
      });

      const j = await safeJson(res);

      if (j?.status === "ok") {
        setMsg("Голос зараховано ✅");
      } else if (j?.status === "already_voted") {
        setMsg("Ти вже голосував з цього браузера 🙂");
      } else if (!res.ok) {
        setMsg("API для лаби 2 ще не готовий. Але інтерфейс уже готовий.");
      } else {
        setMsg("Помилка: " + (j?.error || "unknown"));
      }
    } catch {
      setMsg("API для лаби 2 ще не готовий. Але інтерфейс уже готовий.");
    }
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
          <h1 style={{ margin: 0 }}>Лабораторна 2 — голосування за евристики</h1>
          <p style={{ marginTop: 6, color: "#666" }}>
            Обери 3 евристики, які слід застосувати в першу чергу.
          </p>

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
        <h2 style={{ marginTop: 0 }}>Бюлетень (ТОП-3 евристики)</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                {i === 0 ? "1 місце" : i === 1 ? "2 місце" : "3 місце"}
              </div>
              <div style={{ color: "#666" }}>
                {top[i]
                  ? (() => {
                      const h = heuristics.find((x) => x.id === top[i]);
                      return h ? `${h.code} — ${h.title}` : "Не обрано";
                    })()
                  : "Не обрано"}
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
        <h2 style={{ marginTop: 0 }}>Список евристик</h2>

        {loading ? (
          <p>Завантаження…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {heuristics.map((h) => {
              const badge = getRankLabel(h.id);

              return (
                <div key={h.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                  <div style={{ fontWeight: 800 }}>{h.code}</div>
                  <div style={{ color: "#444", marginTop: 6 }}>{h.title}</div>

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
                      onClick={() => setRank(0, h.id)}
                      style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
                    >
                      1 місце
                    </button>
                    <button
                      onClick={() => setRank(1, h.id)}
                      style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
                    >
                      2 місце
                    </button>
                    <button
                      onClick={() => setRank(2, h.id)}
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
