"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #17324d",
  background: "#17324d",
  color: "#fff",
  cursor: "pointer",
};

export default function GenerateLab3Button() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <button
      type="button"
      onClick={() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("seed", String(Date.now()));
        router.push(`${pathname}?${params.toString()}`);
      }}
      style={buttonStyle}
    >
      Згенерувати нові дані
    </button>
  );
}
