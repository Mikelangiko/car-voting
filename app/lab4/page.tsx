import Link from "next/link";

import Lab4ClientPage from "@/app/lab4/Lab4ClientPage";
import lab3InputJson from "@/data/lab3/input.json";
import { calculateLab4SerialResult } from "@/lib/lab4";
import type { Lab3Input } from "@/lib/lab3";

const input = lab3InputJson as Lab3Input;
const fullBaseline = calculateLab4SerialResult(input).comparable;

const pageStyle: React.CSSProperties = {
  maxWidth: 1280,
  margin: "24px auto",
  padding: 16,
  fontFamily: "var(--font-geist-sans)",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #cfcfcf",
  background: "#fff",
  color: "inherit",
  textDecoration: "none",
};

export default function Lab4Page() {
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
        <div style={{ maxWidth: 920 }}>
          <h1 style={{ margin: 0 }}>Лабораторна 4 — розподілений прямий перебір перестановок</h1>
          <p style={{ marginTop: 10, color: "#52606d" }}>
            Частина 1 перевикористовує набір авто та експертні оцінки з Лаби 3, але рахує перестановки у кількох
            воркерах браузера та перевіряє збіг із еталонним результатом.
          </p>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/" style={buttonStyle}>
              ← Головне меню
            </Link>
            <Link href="/lab3" style={buttonStyle}>
              До Лаби 3
            </Link>
            <Link href="/results" style={buttonStyle}>
              Спільні результати
            </Link>
          </div>
        </div>
      </header>

      <Lab4ClientPage input={input} fullBaseline={fullBaseline} />
    </main>
  );
}
