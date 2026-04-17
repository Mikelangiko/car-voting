import Link from "next/link";

const cardStyle: React.CSSProperties = {
  display: "block",
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 16,
  textDecoration: "none",
  color: "inherit",
  background: "var(--background)",
};

export default function HomePage() {
  return (
    <main style={{ maxWidth: 980, margin: "32px auto", padding: 16, fontFamily: "system-ui" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Лабораторні роботи</h1>
        <p style={{ marginTop: 8, color: "#666" }}>
          Обери потрібну лабораторну роботу або переглянь спільні результати.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <Link href="/lab1" style={cardStyle}>
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>Лабораторна 1</h2>
          <p style={{ margin: 0, color: "#666" }}>Голосування за об’єкти та формування рейтингу.</p>
        </Link>

        <Link href="/lab2" style={cardStyle}>
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>Лабораторна 2</h2>
          <p style={{ margin: 0, color: "#666" }}>Голосування за евристики для відсіювання об’єктів.</p>
        </Link>

        <Link href="/lab3" style={cardStyle}>
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>Лабораторна 3</h2>
          <p style={{ margin: 0, color: "#666" }}>
            Матриці опитування, ранги об&apos;єктів і повний перебір перестановок за sum та max.
          </p>
        </Link>

        <Link href="/lab4" style={cardStyle}>
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>Лабораторна 4</h2>
          <p style={{ margin: 0, color: "#666" }}>
            Розподілений прямий перебір перестановок з верифікацією збігу з результатами Лаби 3.
          </p>
        </Link>

        <Link href="/results" style={cardStyle}>
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>Спільні результати</h2>
          <p style={{ margin: 0, color: "#666" }}>Протоколи, рейтинги та результати для попередніх лабораторних.</p>
        </Link>
      </section>
    </main>
  );
}
