"use client";

import { useState } from "react";

import type { Lab3FullExpertRanking, Lab3GeneticResult, Lab3GeneticSolution } from "@/lib/lab3/genetic";

const tabButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #d0d7de",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

function ExpertRankingsTable({
  rankings,
  objectLabels,
}: {
  rankings: Lab3FullExpertRanking[];
  objectLabels: Record<number, string>;
}) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #d9d9d9", borderRadius: 14, background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "12px 10px", borderBottom: "1px solid #e7e7e7", background: "#f7f8fc" }}>
              Експерт
            </th>
            <th style={{ textAlign: "left", padding: "12px 10px", borderBottom: "1px solid #e7e7e7", background: "#f7f8fc" }}>
              Повне ранжування
            </th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((ranking, rowIndex) => (
            <tr key={ranking.expertId}>
              <td
                style={{
                  padding: "12px 10px",
                  borderBottom: rowIndex === rankings.length - 1 ? "none" : "1px solid #efefef",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Експерт {ranking.expertId}
              </td>
              <td
                style={{
                  padding: "12px 10px",
                  borderBottom: rowIndex === rankings.length - 1 ? "none" : "1px solid #efefef",
                }}
              >
                {ranking.orderingIds.map((id, index) => (
                  <span
                    key={`${ranking.expertId}-${id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      marginRight: 8,
                      marginBottom: 8,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#f5f7fa",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <b>{index + 1}</b>
                    <span>{objectLabels[id] ?? `Об'єкт ${id}`}</span>
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SolutionsList({
  title,
  minValue,
  valueLabel,
  solutions,
}: {
  title: string;
  minValue: number;
  valueLabel: string;
  solutions: Lab3GeneticSolution[];
}) {
  return (
    <section style={{ marginTop: 16 }}>
      <div
        style={{
          border: "1px solid #d9efe6",
          borderRadius: 14,
          background: "#effbf5",
          padding: "12px 14px",
          color: "#245b44",
          fontWeight: 700,
        }}
      >
        {title}: {valueLabel}
        {minValue}
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {solutions.map((solution, index) => (
          <article
            key={`${title}-${solution.orderingIds.join("-")}`}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 16,
              background: "#fff",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Оптимальне ранжування #{index + 1}</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", lineHeight: 1.6 }}>
              {solution.orderingLabels.map((label, rankIndex) => (
                <span
                  key={`${solution.orderingIds.join("-")}-${label}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: "#fafafa",
                  }}
                >
                  <b>{rankIndex + 1}</b>
                  <span>{label}</span>
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function GeneticResultsPanel({
  result,
  objectLabels,
}: {
  result: Lab3GeneticResult;
  objectLabels: Record<number, string>;
}) {
  const [tab, setTab] = useState<"sum" | "max">("sum");

  return (
    <section style={{ marginTop: 18 }}>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>Генетичний алгоритм</h3>

      <div style={{ color: "#666", marginBottom: 14 }}>
        seed: <b>{result.meta.seed}</b>, повних експертних ранжувань: <b>{result.meta.rankingsCount}</b>,
        population: <b>{result.meta.populationSize}</b>, generations: <b>{result.meta.generations}</b>
      </div>

      <ExpertRankingsTable rankings={result.expertRankings} objectLabels={objectLabels} />

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setTab("sum")}
          style={{
            ...tabButtonStyle,
            background: tab === "sum" ? "#eefbf3" : "#fff",
            borderColor: tab === "sum" ? "#9fd5b7" : "#d0d7de",
          }}
        >
          Медіана Кемені-Снелла (sum)
        </button>
        <button
          type="button"
          onClick={() => setTab("max")}
          style={{
            ...tabButtonStyle,
            background: tab === "max" ? "#eef4ff" : "#fff",
            borderColor: tab === "max" ? "#9db8e8" : "#d0d7de",
          }}
        >
          Мінімаксний розв&apos;язок (max)
        </button>
      </div>

      {tab === "sum" ? (
        <SolutionsList
          title="Глобальний консенсус"
          minValue={result.minSum}
          valueLabel="Знайдений мінімум sum: "
          solutions={result.bestBySum}
        />
      ) : (
        <SolutionsList
          title="Мінімаксне ранжування"
          minValue={result.minMax}
          valueLabel="Знайдений мінімум max: "
          solutions={result.bestByMax}
        />
      )}
    </section>
  );
}
