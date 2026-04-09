"use client";

import { useMemo, useState } from "react";

import { getIndependentSolutionsView } from "@/lib/lab2/independent";

export default function IndependentSolutionsTable() {
  const [seed, setSeed] = useState(20260409);
  const data = useMemo(() => getIndependentSolutionsView(seed), [seed]);

  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Знайдені незалежні розв&apos;язки</h2>
          <p style={{ marginTop: 0, marginBottom: 0, color: "#666" }}>
            seed: <b>{data.meta.seed}</b>
          </p>
        </div>

        <button
          onClick={() => setSeed(Math.floor(Math.random() * 1000000000))}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Згенерувати новий набір даних
        </button>
      </div>

      <section style={{ padding: "8px 0", marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>20 експертних перестановок</h3>

        <div
          style={{
            overflowX: "auto",
            border: "1px solid #d9d9d9",
            borderRadius: 14,
            background: "#ffffff",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {data.expertRankings.map((row, index) => (
                <tr key={row.expertId}>
                  <td
                    style={{
                      padding: "16px 18px",
                      borderBottom: index === data.expertRankings.length - 1 ? "none" : "1px solid #ececec",
                      width: 160,
                      fontWeight: 500,
                    }}
                  >
                    Експерт {row.expertId}
                  </td>
                  <td
                    style={{
                      padding: "16px 18px",
                      borderBottom: index === data.expertRankings.length - 1 ? "none" : "1px solid #ececec",
                      color: "#171717",
                    }}
                  >
                    {row.ranking.join(" → ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ padding: "8px 0", marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Оптимальні незалежні розв&apos;язки за K1 та K2</h3>

        <div
          style={{
            overflowX: "auto",
            border: "1px solid #d9d9d9",
            borderRadius: 14,
            background: "#ffffff",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
            <thead>
              <tr style={{ background: "#f7f8fc" }}>
                <th style={{ textAlign: "left", padding: "14px 12px", borderBottom: "1px solid #e6e6e6", width: 60 }}>
                  #
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "14px 12px",
                    borderBottom: "1px solid #e6e6e6",
                    width: "47%",
                  }}
                >
                  Колонка 1: Оптимальні за K1
                  <div style={{ fontWeight: 400, fontSize: 13, marginTop: 4 }}>(Мінімізована сума відстаней)</div>
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "14px 12px",
                    borderBottom: "1px solid #e6e6e6",
                    width: "47%",
                  }}
                >
                  Колонка 2: Оптимальні за K2
                  <div style={{ fontWeight: 400, fontSize: 13, marginTop: 4 }}>(Мінімізований максимум)</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from(
                { length: Math.max(data.k1Solutions.length, data.k2Solutions.length) },
                (_, index) => {
                  const left = data.k1Solutions[index];
                  const right = data.k2Solutions[index];

                  return (
                    <tr key={`independent-${index}`}>
                      <td
                        style={{
                          padding: "16px 12px",
                          verticalAlign: "top",
                          borderBottom:
                            index === Math.max(data.k1Solutions.length, data.k2Solutions.length) - 1
                              ? "none"
                              : "1px solid #efefef",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td
                        style={{
                          padding: "16px 12px",
                          verticalAlign: "top",
                          borderBottom:
                            index === Math.max(data.k1Solutions.length, data.k2Solutions.length) - 1
                              ? "none"
                              : "1px solid #efefef",
                        }}
                      >
                        {left ? (
                          <>
                            <div style={{ color: "#171717", lineHeight: 1.6, fontWeight: 600 }}>
                              [{left.ordering.join(", ")}]
                            </div>
                            <div style={{ marginTop: 8, color: "#666" }}>
                              Знайдено в поколінні {left.generationFound}
                            </div>
                            <div style={{ marginTop: 8, fontWeight: 700 }}>Мінімум Суми (K1): {left.k1Value}</div>
                            <div style={{ marginTop: 4, color: "#666" }}>
                              (При цьому Максимум K2 = {left.k2Value})
                            </div>
                          </>
                        ) : (
                          <span style={{ color: "#999" }}>-</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "16px 12px",
                          verticalAlign: "top",
                          borderBottom:
                            index === Math.max(data.k1Solutions.length, data.k2Solutions.length) - 1
                              ? "none"
                              : "1px solid #efefef",
                        }}
                      >
                        {right ? (
                          <>
                            <div style={{ color: "#171717", lineHeight: 1.6, fontWeight: 600 }}>
                              [{right.ordering.join(", ")}]
                            </div>
                            <div style={{ marginTop: 8, color: "#666" }}>
                              Знайдено в поколінні {right.generationFound}
                            </div>
                            <div style={{ marginTop: 8, fontWeight: 700 }}>
                              Мінімум Максимуму (K2): {right.k2Value}
                            </div>
                            <div style={{ marginTop: 4, color: "#666" }}>(При цьому Сума K1 = {right.k1Value})</div>
                          </>
                        ) : (
                          <span style={{ color: "#999" }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
