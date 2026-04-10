import Link from "next/link";

import GenerateLab3Button from "@/app/lab3/GenerateLab3Button";
import GeneticResultsPanel from "@/app/lab3/GeneticResultsPanel";
import lab3InputJson from "@/data/lab3/input.json";
import { calculateLab3, type Lab3PermutationRow, type Lab3Input } from "@/lib/lab3";
import { runLab3GeneticAlgorithm } from "@/lib/lab3/genetic";
import { generateFullExpertRankings, generateLab3Input } from "@/lib/lab3/generateInput";

const pageStyle: React.CSSProperties = {
  maxWidth: 1280,
  margin: "24px auto",
  padding: 16,
  fontFamily: "var(--font-geist-sans)",
};

const sectionStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 18,
  padding: 18,
  marginTop: 16,
  background: "#fff",
  boxShadow: "0 8px 24px rgba(10, 37, 64, 0.06)",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #cfcfcf",
  background: "#fff",
  color: "inherit",
  textDecoration: "none",
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  border: "1px solid #d9d9d9",
  borderRadius: 14,
  background: "#fff",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #e7e7e7",
  background: "#f7f8fc",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #efefef",
  whiteSpace: "nowrap",
};

const MAX_VISIBLE_OPTIMAL_ROWS = 40;

function SurveyMatrixTable({
  labels,
  rows,
}: {
  labels: string[];
  rows: { label: string; values: number[] }[];
}) {
  return (
    <section style={{ marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>Матриця опитування</h3>
      <div style={tableWrapStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              <th style={thStyle}>Позиція</th>
              {labels.map((label) => (
                <th key={label} style={thStyle}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.label}>
                <td
                  style={{
                    ...tdStyle,
                    fontWeight: 700,
                    borderBottom: rowIndex === rows.length - 1 ? "none" : tdStyle.borderBottom,
                  }}
                >
                  {row.label}
                </td>
                {row.values.map((value, cellIndex) => (
                  <td
                    key={`${row.label}-${labels[cellIndex]}`}
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      borderBottom: rowIndex === rows.length - 1 ? "none" : tdStyle.borderBottom,
                    }}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RankMatrixTable({
  labels,
  rows,
}: {
  labels: string[];
  rows: Array<{
    objectId: number;
    objectName: string;
    values: number[];
  }>;
}) {
  return (
    <section style={{ marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>Матриця рангів об&apos;єктів</h3>
      <div style={tableWrapStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={thStyle}>Об&apos;єкт</th>
              {labels.map((label) => (
                <th key={label} style={thStyle}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.objectId}>
                <td
                  style={{
                    ...tdStyle,
                    fontWeight: 700,
                    borderBottom: rowIndex === rows.length - 1 ? "none" : tdStyle.borderBottom,
                  }}
                >
                  {row.objectId}. {row.objectName}
                </td>
                {row.values.map((value, cellIndex) => (
                  <td
                    key={`${row.objectId}-${labels[cellIndex]}`}
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      color: value === 0 ? "#a0a0a0" : "#171717",
                      borderBottom: rowIndex === rows.length - 1 ? "none" : tdStyle.borderBottom,
                    }}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PermutationsTable({
  title,
  subtitle,
  rows,
  labels,
}: {
  title: string;
  subtitle?: string;
  rows: Lab3PermutationRow[];
  labels: string[];
}) {
  return (
    <section style={{ marginTop: 12 }}>
      <h3 style={{ marginTop: 0, marginBottom: 6 }}>{title}</h3>
      {subtitle ? <p style={{ marginTop: 0, color: "#666" }}>{subtitle}</p> : null}
      <div style={tableWrapStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Перестановка</th>
              {labels.map((label) => (
                <th key={label} style={thStyle}>
                  {label}
                </th>
              ))}
              <th style={thStyle}>Сума</th>
              <th style={thStyle}>Макс</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${row.orderingIds.join("-")}`}>
                <td style={{ ...tdStyle, borderBottom: rowIndex === rows.length - 1 ? "none" : tdStyle.borderBottom }}>
                  {rowIndex + 1}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    minWidth: 240,
                    borderBottom: rowIndex === rows.length - 1 ? "none" : tdStyle.borderBottom,
                  }}
                >
                  [{row.orderingIds.join(", ")}]
                </td>
                {row.distances.map((distance, distanceIndex) => (
                  <td
                    key={`${row.orderingIds.join("-")}-${labels[distanceIndex]}`}
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      borderBottom: rowIndex === rows.length - 1 ? "none" : tdStyle.borderBottom,
                    }}
                  >
                    {distance}
                  </td>
                ))}
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    fontWeight: 700,
                    borderBottom: rowIndex === rows.length - 1 ? "none" : tdStyle.borderBottom,
                  }}
                >
                  {row.sum}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    fontWeight: 700,
                    borderBottom: rowIndex === rows.length - 1 ? "none" : tdStyle.borderBottom,
                  }}
                >
                  {row.max}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function Lab3Page({
  searchParams,
}: {
  searchParams?: Promise<{ seed?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const seedParam = resolvedSearchParams?.seed;
  const parsedSeed = seedParam ? Number(seedParam) : Number.NaN;
  const hasGeneratedSeed = Number.isFinite(parsedSeed);
  const input = hasGeneratedSeed ? generateLab3Input(parsedSeed, 16) : (lab3InputJson as Lab3Input);
  const result = calculateLab3(input, {
    expectedObjectsCount: 10,
    topLimit: 25,
  });
  const effectiveSeed = hasGeneratedSeed ? parsedSeed : 20260410;
  const geneticExpertRankings = generateFullExpertRankings(effectiveSeed, 10, input.objects);
  const geneticResult = runLab3GeneticAlgorithm(input.objects, geneticExpertRankings, effectiveSeed);
  const dataLabel = hasGeneratedSeed ? `Згенеровані дані · seed ${parsedSeed}` : `Базові дані · seed ${effectiveSeed}`;
  const visibleBestBySum = result.bestBySum.slice(0, MAX_VISIBLE_OPTIMAL_ROWS);
  const visibleBestByMax = result.bestByMax.slice(0, MAX_VISIBLE_OPTIMAL_ROWS);
  const objectLabels = Object.fromEntries(input.objects.map((object) => [object.id, object.name]));

  return (
    <main style={pageStyle}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: 880 }}>
          <h1 style={{ margin: 0 }}>Лабораторна 3 — рангові матриці та повний перебір 10!</h1>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/" style={buttonStyle}>
              ← Головне меню
            </Link>
            <Link href="/results" style={buttonStyle}>
              До спільних результатів
            </Link>
            <GenerateLab3Button />
          </div>
        </div>

        <div
          style={{
            minWidth: 280,
            border: "1px solid #dae2ea",
            borderRadius: 16,
            padding: 16,
            background: "linear-gradient(180deg, #f8fbff 0%, #eef5fb 100%)",
          }}
        >
          <div style={{ fontSize: 13, color: "#52606d" }}>Поточна конфігурація</div>
          <div style={{ marginTop: 10, color: "#52606d" }}>{dataLabel}</div>
          <div style={{ marginTop: 10, color: "#52606d" }}>
            {result.summary.objectsCount} об&apos;єктів, {result.summary.expertsCount} експертів
          </div>
          <div style={{ marginTop: 10, color: "#17324d", fontWeight: 700 }}>
            Перебрано: {result.summary.permutationsEvaluated.toLocaleString("uk-UA")}
          </div>
        </div>
      </header>

      <section style={sectionStyle}>
        <SurveyMatrixTable labels={result.surveyMatrix.labels} rows={result.surveyMatrix.rows} />
        <RankMatrixTable labels={result.surveyMatrix.labels} rows={result.rankMatrix} />
      </section>

      <section style={sectionStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div style={{ border: "1px solid #e1e7ee", borderRadius: 14, padding: 14 }}>
            <div style={{ color: "#52606d", fontSize: 13 }}>Перестановок перевірено</div>
            <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800 }}>
              {result.summary.permutationsEvaluated.toLocaleString("uk-UA")}
            </div>
          </div>
          <div style={{ border: "1px solid #e1e7ee", borderRadius: 14, padding: 14 }}>
            <div style={{ color: "#52606d", fontSize: 13 }}>Мінімум sum</div>
            <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800 }}>{result.summary.minSum}</div>
          </div>
          <div style={{ border: "1px solid #e1e7ee", borderRadius: 14, padding: 14 }}>
            <div style={{ color: "#52606d", fontSize: 13 }}>Мінімум max</div>
            <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800 }}>{result.summary.minMax}</div>
          </div>
          <div style={{ border: "1px solid #e1e7ee", borderRadius: 14, padding: 14 }}>
            <div style={{ color: "#52606d", fontSize: 13 }}>Час розрахунку</div>
            <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800 }}>{result.summary.durationMs} мс</div>
          </div>
        </div>

        <PermutationsTable
          title="Оптимальні перестановки за критерієм sum"
          subtitle={
            result.bestBySum.length > MAX_VISIBLE_OPTIMAL_ROWS
              ? `Показано перші ${MAX_VISIBLE_OPTIMAL_ROWS} з ${result.bestBySum.length} оптимальних перестановок.`
              : `Усього оптимальних перестановок: ${result.bestBySum.length}.`
          }
          rows={visibleBestBySum}
          labels={result.surveyMatrix.labels}
        />

        <PermutationsTable
          title="Оптимальні перестановки за критерієм max"
          subtitle={
            result.bestByMax.length > MAX_VISIBLE_OPTIMAL_ROWS
              ? `Показано перші ${MAX_VISIBLE_OPTIMAL_ROWS} з ${result.bestByMax.length} оптимальних перестановок.`
              : `Усього оптимальних перестановок: ${result.bestByMax.length}.`
          }
          rows={visibleBestByMax}
          labels={result.surveyMatrix.labels}
        />

        <GeneticResultsPanel
          result={geneticResult}
          objectLabels={objectLabels}
        />
      </section>
    </main>
  );
}
