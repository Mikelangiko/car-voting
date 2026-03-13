"use client";

import { useEffect, useMemo, useState } from "react";
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

type HeuristicProtocolRow = {
  expert: string;
  first: string;
  second: string;
  third: string;
  created_at?: string;
};

type HeuristicResultRow = {
  id: number;
  code: string;
  title: string;
  points: number;
};

type FinalistRow = {
  id: number;
  name: string;
  year?: number | null;
};

type Lab2FinalistsResponse = {
  status?: string;
  finalists?: FinalistRow[];
  steps?: {
    code: string;
    title: string;
    before: number;
    after: number;
    removed: number;
  }[];
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { status: "error", error: text || `HTTP ${res.status}` };
  }
}

const fallbackHeuristicResults: HeuristicResultRow[] = [
  { id: 1, code: "E1", title: "Участь в одному множинному порівнянні на 3 місці", points: 0 },
  { id: 2, code: "E2", title: "Участь в одному множинному порівнянні на 2 місці", points: 0 },
  { id: 3, code: "E3", title: "Участь в одному множинному порівнянні на 1 місці", points: 0 },
  { id: 4, code: "E4", title: "Участь у двох множинних порівняннях на 3 місці", points: 0 },
  { id: 5, code: "E5", title: "Участь в одному МП на 3 місці та ще в одному — на 2 місці", points: 0 },
  { id: 6, code: "E6", title: "Об’єкт жодного разу не посідав 1 місце", points: 0 },
  { id: 7, code: "E7", title: "Об’єкт згадувався лише один раз незалежно від позиції", points: 0 },
];

export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "lab1" | "lab2">("all");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [cars, setCars] = useState<CarRow[]>([]);
  const [protocol, setProtocol] = useState<ProtocolRow[]>([]);

  const [lab2Protocol, setLab2Protocol] = useState<HeuristicProtocolRow[]>([]);
  const [lab2Results, setLab2Results] = useState<HeuristicResultRow[]>(fallbackHeuristicResults);
  const [lab2Finalists, setLab2Finalists] = useState<FinalistRow[]>([]);
  const [lab2Steps, setLab2Steps] = useState<
    { code: string; title: string; before: number; after: number; removed: number }[]
  >([]);

  const lab1Top10 = useMemo(() => cars.slice(0, 10), [cars]);

  async function refresh() {
    setLoading(true);
    setMsg("");

    try {
      const [resResults, resProtocol, resLab2Results, resLab2Protocol, resLab2Finalists] =
        await Promise.all([
          fetch("/api/results", { cache: "no-store" }),
          fetch("/api/protocol", { cache: "no-store" }),
          fetch("/api/lab2/results", { cache: "no-store" }).catch(() => null as any),
          fetch("/api/lab2/protocol", { cache: "no-store" }).catch(() => null as any),
          fetch("/api/lab2/finalists", { cache: "no-store" }).catch(() => null as any),
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
            ? `${prev} | Помилка /api/protocol: ${dataProtocol?.error || resProtocol.status}`
            : `Помилка /api/protocol: ${dataProtocol?.error || resProtocol.status}`
        );
      } else {
        setProtocol(Array.isArray(dataProtocol?.protocol) ? dataProtocol.protocol : []);
      }

      if (resLab2Results && "ok" in resLab2Results) {
        const dataLab2Results = await safeJson(resLab2Results);
        if (resLab2Results.ok) {
          const rows = Array.isArray(dataLab2Results?.heuristics)
            ? dataLab2Results.heuristics
            : Array.isArray(dataLab2Results)
            ? dataLab2Results
            : [];
          setLab2Results(rows.length ? rows : fallbackHeuristicResults);
        } else {
          setLab2Results(fallbackHeuristicResults);
        }
      } else {
        setLab2Results(fallbackHeuristicResults);
      }

      if (resLab2Protocol && "ok" in resLab2Protocol) {
        const dataLab2Protocol = await safeJson(resLab2Protocol);
        if (resLab2Protocol.ok) {
          setLab2Protocol(Array.isArray(dataLab2Protocol?.protocol) ? dataLab2Protocol.protocol : []);
        } else {
          setLab2Protocol([]);
        }
      } else {
        setLab2Protocol([]);
      }

      if (resLab2Finalists && "ok" in resLab2Finalists) {
        const dataLab2Finalists = (await safeJson(resLab2Finalists)) as Lab2FinalistsResponse;
        if (resLab2Finalists.ok) {
          setLab2Finalists(Array.isArray(dataLab2Finalists?.finalists) ? dataLab2Finalists.finalists : []);
          setLab2Steps(Array.isArray(dataLab2Finalists?.steps) ? dataLab2Finalists.steps : []);
        } else {
          setLab2Finalists([]);
          setLab2Steps([]);
        }
      } else {
        setLab2Finalists([]);
        setLab2Steps([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <main style={{ maxWidth: 1120, margin: "24px auto", padding: 16, fontFamily: "system-ui" }}>
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
          <h1 style={{ margin: 0 }}>Спільні результати лабораторних робіт</h1>

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
              href="/lab1"
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #ccc",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              ← До лаби 1
            </Link>

            <Link
              href="/lab2"
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #ccc",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              ← До лаби 2
            </Link>
          </div>
        </div>

        <button
          onClick={refresh}
          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Оновити
        </button>
      </header>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("all")}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ccc",
            cursor: "pointer",
            fontWeight: activeTab === "all" ? 700 : 400,
          }}
        >
          Усе
        </button>
        <button
          onClick={() => setActiveTab("lab1")}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ccc",
            cursor: "pointer",
            fontWeight: activeTab === "lab1" ? 700 : 400,
          }}
        >
          Лаба 1
        </button>
        <button
          onClick={() => setActiveTab("lab2")}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ccc",
            cursor: "pointer",
            fontWeight: activeTab === "lab2" ? 700 : 400,
          }}
        >
          Лаба 2
        </button>
      </div>

      {msg && (
        <p style={{ marginTop: 12, padding: 10, border: "1px solid #ddd", borderRadius: 12 }}>
          {msg}
        </p>
      )}

      {(activeTab === "all" || activeTab === "lab1") && (
        <>
          <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Лабораторна 1 — протокол голосування</h2>

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

          <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Лабораторна 1 — рейтинг об’єктів</h2>

            {loading ? (
              <p>Завантаження…</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Місце</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Об’єкт</th>
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

          
        </>
      )}

      {(activeTab === "all" || activeTab === "lab2") && (
        <>
          <section style={{ padding: "8px 0", marginTop: 18 }}>
            <h2 style={{ marginTop: 0 }}>Протокол ЛР2</h2>

            {loading ? (
              <p>Завантаження…</p>
            ) : lab2Protocol.length === 0 ? (
              <p>Поки що немає голосів або API лаби 2 ще не підключений.</p>
            ) : (
              <>
                <p style={{ marginTop: 0, marginBottom: 14, fontSize: 18 }}>
                  Всього голосів: <b>{lab2Protocol.length}</b>
                </p>

                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #d9d9d9",
                    borderRadius: 14,
                    background: "#000000",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {lab2Protocol.map((p, idx) => (
                        <tr key={p.expert + idx}>
                          <td
                            style={{
                              padding: "16px 18px",
                              borderBottom: idx === lab2Protocol.length - 1 ? "none" : "1px solid #ececec",
                              width: "45%",
                              fontWeight: 500,
                            }}
                          >
                            {p.expert}
                          </td>
                          <td
                            style={{
                              padding: "16px 18px",
                              borderBottom: idx === lab2Protocol.length - 1 ? "none" : "1px solid #ececec",
                              color: "#ffffff",
                            }}
                          >
                            {[p.first, p.second, p.third].filter(Boolean).join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section style={{ padding: "8px 0", marginTop: 18 }}>
            <h2 style={{ marginTop: 0 }}>Популярність евристик</h2>

            {loading ? (
              <p>Завантаження…</p>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid #d9d9d9",
                  borderRadius: 14,
                  background: "#000000",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#000000" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "16px 14px",
                          borderBottom: "1px solid #e6e6e6",
                          width: 90,
                        }}
                      >
                        Місце
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "16px 14px",
                          borderBottom: "1px solid #e6e6e6",
                        }}
                      >
                        Евристика
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "16px 14px",
                          borderBottom: "1px solid #e6e6e6",
                          width: 120,
                        }}
                      >
                        Кількість
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {lab2Results.map((h, idx) => (
                      <tr key={h.id}>
                        <td
                          style={{
                            padding: "16px 14px",
                            borderBottom: idx === lab2Results.length - 1 ? "none" : "1px solid #efefef",
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td
                          style={{
                            padding: "16px 14px",
                            borderBottom: idx === lab2Results.length - 1 ? "none" : "1px solid #efefef",
                          }}
                        >
                          {h.title}
                        </td>
                        <td
                          style={{
                            padding: "16px 14px",
                            borderBottom: idx === lab2Results.length - 1 ? "none" : "1px solid #efefef",
                            fontWeight: 600,
                          }}
                        >
                          {h.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={{ padding: "8px 0", marginTop: 18 }}>
            <h2 style={{ marginTop: 0 }}>Підмножина переможців (макс. 10)</h2>

            {loading ? (
              <p>Завантаження…</p>
            ) : (
              <>
                <p style={{ marginTop: 0, marginBottom: 14, fontSize: 17 }}>
                  Застосовано топ-3 евристики:{" "}
                  <span
                    style={{
                      background: "#000000",
                      padding: "4px 8px",
                      borderRadius: 8,
                    }}
                  >
                    {lab2Results.slice(0, 3).map((h) => h.code).join(", ")}
                  </span>
                </p>

                {lab2Steps.length > 0 && (
                  <div
                    style={{
                      overflowX: "auto",
                      border: "1px solid #d9d9d9",
                      borderRadius: 14,
                      background: "#000000",
                      marginBottom: 16,
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#000000" }}>
                          <th style={{ textAlign: "left", padding: "14px 12px", borderBottom: "1px solid #e6e6e6" }}>
                            Евристика
                          </th>
                          <th style={{ textAlign: "left", padding: "14px 12px", borderBottom: "1px solid #e6e6e6" }}>
                            Було
                          </th>
                          <th style={{ textAlign: "left", padding: "14px 12px", borderBottom: "1px solid #e6e6e6" }}>
                            Стало
                          </th>
                          <th style={{ textAlign: "left", padding: "14px 12px", borderBottom: "1px solid #e6e6e6" }}>
                            Відсіяно
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lab2Steps.map((step, idx) => (
                          <tr key={step.code + idx}>
                            <td
                              style={{
                                padding: "14px 12px",
                                borderBottom: idx === lab2Steps.length - 1 ? "none" : "1px solid #efefef",
                              }}
                            >
                              {step.code}
                            </td>
                            <td
                              style={{
                                padding: "14px 12px",
                                borderBottom: idx === lab2Steps.length - 1 ? "none" : "1px solid #efefef",
                              }}
                            >
                              {step.before}
                            </td>
                            <td
                              style={{
                                padding: "14px 12px",
                                borderBottom: idx === lab2Steps.length - 1 ? "none" : "1px solid #efefef",
                              }}
                            >
                              {step.after}
                            </td>
                            <td
                              style={{
                                padding: "14px 12px",
                                borderBottom: idx === lab2Steps.length - 1 ? "none" : "1px solid #efefef",
                              }}
                            >
                              {step.removed}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {lab2Finalists.length > 0 ? (
                  <div
                    style={{
                      overflowX: "auto",
                      border: "1px solid #d9d9d9",
                      borderRadius: 14,
                      background: "#000000",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        {lab2Finalists.map((f, idx) => (
                          <tr key={f.id}>
                            <td
                              style={{
                                padding: "16px 18px",
                                borderBottom: idx === lab2Finalists.length - 1 ? "none" : "1px solid #ececec",
                                fontWeight: 500,
                              }}
                            >
                              {idx + 1}. {f.name} {f.year ? `(${f.year})` : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: "#666" }}>
                    Фінальна підмножина поки не показується, бо API для автоматичного відсіювання ще не підключений.
                  </p>
                )}
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
