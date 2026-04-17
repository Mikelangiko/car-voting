"use client";

import { useEffect, useRef, useState } from "react";

import {
  LAB4_DEFAULT_PROCESSOR_MODE,
  LAB4_PROCESSOR_MODE_OPTIONS,
  aggregateLab4WorkerResults,
  buildLab4SatisfactionMatrix,
  buildLab4VerificationResult,
  createLab4WorkerTasks,
  getLab4SelectionState,
  type Lab4ComparableResult,
  type Lab4DistributedResult,
  type Lab4ProcessorMode,
  type Lab4SatisfactionMatrix,
  type Lab4VerificationResult,
  type Lab4WorkerLocalResult,
  type Lab4WorkerMessage,
} from "@/lib/lab4";
import type { Lab3Input } from "@/lib/lab3";

const sectionStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 18,
  padding: 18,
  marginTop: 16,
  background: "#fff",
  boxShadow: "0 8px 24px rgba(10, 37, 64, 0.06)",
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
  verticalAlign: "top",
};

type VerificationState =
  | { status: "idle" }
  | { status: "ready"; result: Lab4VerificationResult };

type RunState =
  | { status: "idle" }
  | { status: "running"; startedAt: number }
  | { status: "completed"; startedAt: number; finishedAt: number }
  | { status: "error"; message: string };

type WorkerProgressState = {
  workerId: number;
  processed: number;
  total: number;
};

function formatNumber(value: number) {
  return value.toLocaleString("uk-UA");
}

function formatDuration(durationMs: number) {
  return `${(durationMs / 1000).toFixed(durationMs >= 10000 ? 1 : 2)} сек.`;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ border: "1px solid #e1e7ee", borderRadius: 14, padding: 14 }}>
      <div style={{ color: "#52606d", fontSize: 13 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800 }}>{value}</div>
      {hint ? <div style={{ marginTop: 6, color: "#6b7785", fontSize: 13 }}>{hint}</div> : null}
    </div>
  );
}

function ProcessorModePicker({
  value,
  disabled,
  onChange,
}: {
  value: Lab4ProcessorMode;
  disabled: boolean;
  onChange: (value: Lab4ProcessorMode) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
      {LAB4_PROCESSOR_MODE_OPTIONS.map((option) => {
        const selected = option === value;
        const title = option === 1 ? "1 потік" : "10 потоків";
        const description =
          option === 1
            ? "Усі 10! перестановок рахує один воркер."
            : "Пошук ділиться на 10 воркерів за першим елементом перестановки.";

        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            style={{
              textAlign: "left",
              padding: 16,
              borderRadius: 16,
              border: selected ? "1px solid #2f6fed" : "1px solid #d3d8e0",
              background: selected ? "#eef4ff" : "#fff",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <div style={{ fontWeight: 800, color: selected ? "#173a7a" : "#1f2933" }}>{title}</div>
            <div style={{ marginTop: 8, color: "#52606d", lineHeight: 1.5 }}>{description}</div>
          </button>
        );
      })}
    </div>
  );
}

function MatrixValue({ value }: { value: number | null }) {
  return <>{value === null ? " - " : value}</>;
}

function SatisfactionMatrixTable({ matrix }: { matrix: Lab4SatisfactionMatrix }) {
  return (
    <div style={tableWrapStyle}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180 }}>
        <thead>
          <tr>
            <th style={thStyle}>Об&apos;єкти \ Експерти</th>
            {matrix.expertLabels.map((label) => (
              <th key={label} style={{ ...thStyle, textAlign: "center" }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.objectRows.map((row, rowIndex) => (
            <tr key={row.objectId}>
              <td
                style={{
                  ...tdStyle,
                  fontWeight: 700,
                  borderBottom: rowIndex === matrix.objectRows.length - 1 ? tdStyle.borderBottom : tdStyle.borderBottom,
                }}
              >
                {row.objectId}. {row.objectName}
              </td>
              {row.values.map((value, cellIndex) => (
                <td
                  key={`${row.objectId}-${matrix.expertLabels[cellIndex]}`}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                  }}
                >
                  <MatrixValue value={value} />
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td style={{ ...tdStyle, fontWeight: 700, background: "#f7f8fc" }}>Сума S|Nᵢ - M|</td>
            {matrix.sumRow.map((value, index) => (
              <td key={`sum-${index}`} style={{ ...tdStyle, textAlign: "center", background: "#f7f8fc" }}>
                {value}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ ...tdStyle, fontWeight: 700 }}>Штраф (вилучені)</td>
            {matrix.penaltyRow.map((value, index) => (
              <td key={`penalty-${index}`} style={{ ...tdStyle, textAlign: "center" }}>
                {value === 0 ? " - " : `+${value}`}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ ...tdStyle, fontWeight: 700, background: "#f7f8fc" }}>Загальна відстань</td>
            {matrix.totalDistanceRow.map((value, index) => (
              <td key={`distance-${index}`} style={{ ...tdStyle, textAlign: "center", background: "#f7f8fc" }}>
                {value}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ ...tdStyle, fontWeight: 700 }}>Задоволеність</td>
            {matrix.satisfactionRow.map((value, index) => (
              <td key={`satisfaction-${index}`} style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>
                {value.toFixed(2)}%
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function VerificationPanel({ verification }: { verification: VerificationState }) {
  if (verification.status === "idle") {
    return (
      <div style={{ border: "1px dashed #cfd6de", borderRadius: 16, padding: 14, color: "#52606d" }}>
        Після завершення перебору тут з’явиться доказ збігу з еталонним результатом Лаби 3 для повного набору з 10
        авто.
      </div>
    );
  }

  const { result } = verification;

  return (
    <div
      style={{
        border: `1px solid ${result.matches ? "#b8e0c7" : "#f1c0c0"}`,
        borderRadius: 16,
        padding: 16,
        background: result.matches ? "#effbf5" : "#fff5f5",
      }}
    >
      <div style={{ fontWeight: 800, color: result.matches ? "#245b44" : "#8a2231" }}>
        {result.matches ? "Верифікація успішна" : "Верифікація не пройдена"}
      </div>
      <div style={{ marginTop: 8, color: "#52606d" }}>Режим: повний набір із 10 авто.</div>
      <div style={{ marginTop: 6, color: "#52606d" }}>Порівняння з: {result.comparedAgainst}</div>
      <div style={{ marginTop: 8 }}>{result.summary}</div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          ["Перестановки", result.details.permutationsEvaluated],
          ["Min sum", result.details.minSum],
          ["Min max", result.details.minMax],
          ["Best by sum", result.details.bestBySum],
          ["Best by max", result.details.bestByMax],
        ].map(([label, ok]) => (
          <span
            key={String(label)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #d7dde5",
              background: "#fff",
              color: ok ? "#245b44" : "#8a2231",
              fontWeight: 700,
            }}
          >
            {ok ? "OK" : "NO"} · {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Lab4ClientPage({
  input,
  fullBaseline,
}: {
  input: Lab3Input;
  fullBaseline: Lab4ComparableResult;
}) {
  const [processorMode, setProcessorMode] = useState<Lab4ProcessorMode>(LAB4_DEFAULT_PROCESSOR_MODE);
  const [runState, setRunState] = useState<RunState>({ status: "idle" });
  const [progressByWorker, setProgressByWorker] = useState<Record<number, WorkerProgressState>>({});
  const [distributedResult, setDistributedResult] = useState<Lab4DistributedResult | null>(null);
  const [verification, setVerification] = useState<VerificationState>({ status: "idle" });
  const [errorMessage, setErrorMessage] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());
  const runIdRef = useRef(0);
  const workersRef = useRef<Worker[]>([]);
  const selection = getLab4SelectionState(input, processorMode);
  const satisfactionMatrix =
    distributedResult && distributedResult.bestBySum.length > 0
      ? buildLab4SatisfactionMatrix(distributedResult.input, distributedResult.bestBySum[0].orderingIds)
      : null;

  useEffect(() => {
    if (runState.status !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowTick(Date.now());
    }, 120);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [runState.status]);

  useEffect(() => {
    return () => {
      for (const worker of workersRef.current) {
        worker.terminate();
      }
      workersRef.current = [];
    };
  }, []);

  const terminateWorkers = () => {
    for (const worker of workersRef.current) {
      worker.terminate();
    }
    workersRef.current = [];
  };

  const runDistributedSearch = () => {
    setErrorMessage("");
    setDistributedResult(null);
    setVerification({ status: "idle" });
    terminateWorkers();

    let setup;

    try {
      setup = createLab4WorkerTasks(input, processorMode);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не вдалося підготувати дані для перебору.";
      setRunState({ status: "error", message });
      setErrorMessage(message);
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const startedAt = Date.now();
    const collectedResults = new Map<number, Lab4WorkerLocalResult>();

    setRunState({ status: "running", startedAt });
    setProgressByWorker(
      Object.fromEntries(
        setup.tasks.map((task) => [
          task.workerId,
          {
            workerId: task.workerId,
            processed: 0,
            total: task.fixedFirstObjectId === null ? setup.selection.permutationsCount : setup.selection.permutationsCount / 10,
          },
        ])
      )
    );

    const failRun = (message: string) => {
      if (runIdRef.current !== runId) {
        return;
      }

      terminateWorkers();
      setRunState({ status: "error", message });
      setErrorMessage(message);
    };

    const finalizeRun = () => {
      if (runIdRef.current !== runId || collectedResults.size !== setup.tasks.length) {
        return;
      }

      terminateWorkers();
      const result = aggregateLab4WorkerResults(
        setup.input,
        setup.selection,
        Array.from(collectedResults.values()),
        Date.now() - startedAt
      );

      setDistributedResult(result);
      setRunState({
        status: "completed",
        startedAt,
        finishedAt: Date.now(),
      });
      setVerification({
        status: "ready",
        result: buildLab4VerificationResult({
          actual: result.comparable,
          expected: fullBaseline,
          comparedAgainst: "еталонний результат Лаби 3 для всіх 10 авто",
        }),
      });
    };

    setup.tasks.forEach((task) => {
      const worker = new Worker("/workers/lab4-permutation-worker.js");
      workersRef.current.push(worker);

      worker.onmessage = (event: MessageEvent<Lab4WorkerMessage>) => {
        if (runIdRef.current !== runId) {
          worker.terminate();
          return;
        }

        const message = event.data;

        if (message.type === "progress") {
          setProgressByWorker((previous) => ({
            ...previous,
            [message.workerId]: {
              workerId: message.workerId,
              processed: message.processed,
              total: message.total,
            },
          }));
          return;
        }

        if (message.type === "done") {
          collectedResults.set(message.workerId, message.result);
          setProgressByWorker((previous) => ({
            ...previous,
            [message.workerId]: {
              workerId: message.workerId,
              processed: message.result.permutationsEvaluated,
              total: message.result.permutationsEvaluated,
            },
          }));
          worker.terminate();
          finalizeRun();
          return;
        }

        failRun(message.error);
      };

      worker.onerror = () => {
        failRun(`Воркер ${task.workerId} завершився з помилкою.`);
      };

      worker.postMessage(task);
    });
  };

  const elapsedMs =
    runState.status === "running"
      ? nowTick - runState.startedAt
      : runState.status === "completed"
      ? runState.finishedAt - runState.startedAt
      : distributedResult?.durationMs ?? 0;
  const totalProcessed = Object.values(progressByWorker).reduce((total, worker) => total + worker.processed, 0);
  const totalExpected = Object.values(progressByWorker).reduce((total, worker) => total + worker.total, 0);
  const completedWorkers = Object.values(progressByWorker).filter((worker) => worker.processed >= worker.total && worker.total > 0).length;

  return (
    <>
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>4. Розподілений прямий перебір перестановок</h2>
        <p style={{ marginTop: 0, color: "#52606d" }}>
          У цій частині завжди використовуються всі 10 авто з Лаби 3. Можна перемикатися між режимами виконання: `1
          потік` або `10 потоків`.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          <StatCard label="Кількість авто" value={String(selection.selectedObjects.length)} hint="Набір фіксований: 10 об'єктів" />
          <StatCard label="Кількість експертів" value={String(selection.activeExpertsCount)} hint="Усі експерти з Лаби 3" />
          <StatCard label="Усього перестановок" value={formatNumber(selection.permutationsCount)} hint="10!" />
          <StatCard
            label="Кількість потоків"
            value={String(selection.processorsCount)}
            hint={selection.processorsCount === 1 ? "Один воркер на весь перебір" : "Десять воркерів за першим елементом"}
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <ProcessorModePicker
            value={processorMode}
            disabled={runState.status === "running"}
            onChange={setProcessorMode}
          />
        </div>

        <div style={{ marginTop: 16, color: "#2f3a46", lineHeight: 1.6 }}>
          <div>
            <b>Об'єкти:</b> {selection.selectedObjects.map((object) => `${object.id}. ${object.name}`).join(", ")}
          </div>
          <div>
            <b>Режим перебору:</b>{" "}
            {processorMode === 1
              ? "один потік обчислює всі 3,628,800 перестановок"
              : "10 потоків обчислюють по 362,880 перестановок кожен"}
            .
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={runDistributedSearch}
            disabled={runState.status === "running"}
            style={{
              padding: "12px 18px",
              borderRadius: 14,
              border: "1px solid #5e4ae3",
              background: runState.status === "running" ? "#d7d2ff" : "#6d5ef3",
              color: "#fff",
              cursor: runState.status === "running" ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            Запустити перебір ({processorMode === 1 ? "1 потік" : "10 потоків"})
          </button>
        </div>

        {errorMessage ? (
          <div style={{ marginTop: 14, color: "#8a2231", fontWeight: 600 }}>{errorMessage}</div>
        ) : null}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Хід виконання та верифікація</h2>

        {runState.status === "running" ? (
          <div
            style={{
              border: "1px solid #cfe6d5",
              borderRadius: 16,
              background: "#edf9f0",
              padding: "14px 16px",
              color: "#245b44",
              fontWeight: 700,
            }}
          >
            Перебір триває: {formatNumber(totalProcessed)} / {formatNumber(totalExpected)} перестановок, завершено потоків{" "}
            {completedWorkers} / {selection.processorsCount}, час {formatDuration(elapsedMs)}.
          </div>
        ) : null}

        {runState.status === "completed" && distributedResult ? (
          <div
            style={{
              border: "1px solid #cfe6d5",
              borderRadius: 16,
              background: "#edf9f0",
              padding: "14px 16px",
              color: "#245b44",
              fontWeight: 700,
            }}
          >
            Перебір завершено за {formatDuration(distributedResult.durationMs)}. Перевірено{" "}
            {formatNumber(distributedResult.permutationsEvaluated)} перестановок.
          </div>
        ) : null}

        {runState.status === "idle" ? (
          <div style={{ color: "#52606d" }}>
            Після запуску тут з’являться прогрес перебору, таблиця по кожному потоку та підсумок верифікації з Лабою 3.
          </div>
        ) : null}

        <div style={{ marginTop: 18 }}>
          <VerificationPanel verification={verification} />
        </div>
      </section>

      {distributedResult ? (
        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Матриця обчислення індексів задоволеності</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <StatCard label="Перевірено перестановок" value={formatNumber(distributedResult.permutationsEvaluated)} />
            <StatCard label="Глобальний min sum" value={String(distributedResult.minSum)} />
            <StatCard label="Глобальний min max" value={String(distributedResult.minMax)} />
            <StatCard label="Загальний час" value={formatDuration(distributedResult.durationMs)} />
          </div>

          {satisfactionMatrix ? (
            <section style={{ marginTop: 18 }}>
              <p style={{ marginTop: 0, color: "#52606d" }}>
                Для матриці використано перше компромісне ранжування за критерієм <b>sum</b>:{" "}
                {satisfactionMatrix.compromiseOrderingLabels.join(" → ")}.
              </p>
              <SatisfactionMatrixTable matrix={satisfactionMatrix} />
            </section>
          ) : null}
        </section>
      ) : null}

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Наступні частини лабораторної</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {[
            "Частина 2: наступний розрахунок для матриці індексів задоволеності.",
            "Частина 3: додаткові порівняння та візуалізації для компромісних ранжувань.",
            "Частина 4: фінальне оформлення висновків та допоміжних перевірок.",
          ].map((text) => (
            <div key={text} style={{ border: "1px dashed #ccd4dd", borderRadius: 16, padding: 16, color: "#52606d" }}>
              {text}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
