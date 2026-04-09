"use client";

import { usePathname, useRouter } from "next/navigation";

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

  return (
    <button
      type="button"
      onClick={() => {
        router.push(`${pathname}?seed=${Date.now()}`);
      }}
      style={buttonStyle}
    >
      Згенерувати нові дані
    </button>
  );
}
