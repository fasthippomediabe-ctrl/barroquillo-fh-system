"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function MonthlyChart({
  data,
}: {
  data: { month: string; Revenue: number; Expenses: number }[];
}) {
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5ebf5" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(v) =>
              `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
            }
          />
          <Legend />
          <Bar dataKey="Revenue" fill="#27ae60" />
          <Bar dataKey="Expenses" fill="#e74c3c" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
