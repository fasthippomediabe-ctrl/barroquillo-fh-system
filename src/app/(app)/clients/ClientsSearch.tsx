"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function ClientsSearch({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(sp);
      if (q) params.set("q", q);
      else params.delete("q");
      router.replace(`/clients?${params.toString()}`);
    }, 200);
    return () => clearTimeout(t);
  }, [q, router, sp]);

  return (
    <div>
      <input
        className="input max-w-md"
        placeholder="Search by deceased name, contact, or phone…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </div>
  );
}
