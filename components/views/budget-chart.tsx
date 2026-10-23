"use client";
import {
  budgetAllocations,
  budgetTotals,
  money,
  type Celebration,
} from "@/lib/planner";

export function BudgetChart({
  event,
  compact = false,
}: {
  event: Celebration;
  compact?: boolean;
}) {
  const allocations = budgetAllocations(event),
    total = budgetTotals(event).recorded,
    percent = Math.round((total / event.budget) * 100);
  const denominator = Math.max(event.budget, total);
  return (
    <div className={`budget-chart ${compact ? "compact" : ""}`}>
      <div className="donut-wrap">
        <svg
          viewBox="0 0 160 160"
          role="img"
          aria-label={`${percent}% of your budget recorded`}
        >
          <circle
            cx="80"
            cy="80"
            r="64"
            fill="none"
            stroke="#f0eee7"
            strokeWidth="17"
          />
          {allocations.map((row, index) => {
            const share = (row.spent / denominator) * 402.124,
              offset = allocations
                .slice(0, index)
                .reduce(
                  (sum, previous) =>
                    sum + (previous.spent / denominator) * 402.124,
                  0,
                );
            return (
              <circle
                key={row.category}
                cx="80"
                cy="80"
                r="64"
                fill="none"
                stroke={row.color}
                strokeWidth="17"
                strokeDasharray={`${Math.max(0, share - 2)} ${402.124 - Math.max(0, share - 2)}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 80 80)"
              />
            );
          })}
        </svg>
        <div className="donut-center">
          <strong>
            {percent}
            <span>%</span>
          </strong>
          <small>of your budget</small>
        </div>
      </div>
      <div className="chart-legend">
        {allocations
          .filter((a) => a.spent > 0)
          .slice(0, 4)
          .map((row) => (
            <div key={row.category}>
              <span>
                <i style={{ background: row.color }} />
                {row.category}
              </span>
              <strong>{money(row.spent)}</strong>
            </div>
          ))}
        {total === 0 && (
          <p>
            Record your first expense to see your celebration come together.
          </p>
        )}
        <div className="remaining-legend">
          <span>
            <i style={{ background: "#e7e4da" }} />
            {total > event.budget ? "Over budget" : "Still available"}
          </span>
          <strong>{money(Math.abs(event.budget - total))}</strong>
        </div>
      </div>
    </div>
  );
}
