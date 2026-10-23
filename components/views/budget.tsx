"use client";
import {
  budgetAllocations,
  budgetTotals,
  money,
  type Celebration,
} from "@/lib/planner";
import {
  ArrowRight,
  Check,
  Clock3,
  MoreHorizontal,
  Wallet,
} from "lucide-react";
import { EmptyState, SectionHeader } from "../ui";
import { BudgetChart } from "./budget-chart";
import type { OpenItem, Update } from "./types";

export function BudgetView({
  event,
  update,
  openItem,
  ask,
}: {
  event: Celebration;
  update: Update;
  openItem: OpenItem;
  ask: (prompt: string) => void;
}) {
  const allocations = budgetAllocations(event);
  const { recorded: total, paid, unpaid, remaining } = budgetTotals(event);
  return (
    <>
      <div className="budget-summary-grid">
        <div className="panel total-budget">
          <span className="eyebrow">YOUR CELEBRATION BUDGET</span>
          <strong>{money(event.budget)}</strong>
          <span>{money(remaining)} remaining</span>
          <div className="progress-track">
            <i
              style={{
                width: `${Math.min(100, (total / event.budget) * 100)}%`,
                background: total > event.budget ? "#b76149" : undefined,
              }}
            />
          </div>
          <div className="budget-split">
            <div>
              <span>Recorded expenses</span>
              <strong>{money(total)}</strong>
            </div>
            <div>
              <span>Already paid</span>
              <strong>{money(paid)}</strong>
            </div>
            <div>
              <span>Still to pay</span>
              <strong>{money(unpaid)}</strong>
            </div>
          </div>
        </div>
        <div className="panel">
          <SectionHeader title="Where it’s all going" />
          <BudgetChart event={event} />
        </div>
      </div>
      {total > event.budget && (
        <div className="note warning">
          <Wallet size={20} />
          <p>
            Your recorded expenses exceed your budget by{" "}
            {money(Math.abs(remaining))}. Review your biggest categories or
            adjust your event budget.
          </p>
          <button
            className="text-button"
            onClick={() =>
              ask("Help me reduce spending to get back within my budget")
            }
          >
            Find savings
            <ArrowRight size={15} />
          </button>
        </div>
      )}
      <section className="panel">
        <SectionHeader
          title="A thoughtful starting point"
          description="Suggested allocations for your event. Actual quotes may vary."
          action={() => ask("Help me personalize my budget allocation")}
          actionLabel="Ask Gather"
        />
        <div className="allocation-grid">
          {allocations.map((a) => (
            <div className="allocation-item" key={a.category}>
              <span>
                <i style={{ background: a.color }} />
                {a.category}
              </span>
              <strong>{money(a.planned)}</strong>
              <div className="progress-track">
                <i
                  style={{
                    width: `${Math.min(100, (a.spent / a.planned) * 100)}%`,
                    background: a.color,
                  }}
                />
              </div>
              <small>
                {money(a.spent)} recorded
                {a.spent > a.planned ? " · Above suggestion" : ""}
              </small>
            </div>
          ))}
        </div>
      </section>
      <section className="panel expenses-panel">
        <SectionHeader
          title="The little details add up"
          description="Track every deposit, purchase and happy little extra."
          action={() => openItem("expense")}
          actionLabel="Add an expense"
        />
        {event.expenses.length ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Scrollable planning table"
          >
            <table>
              <caption className="sr-only">
                {event.name} planning records
              </caption>
              <thead>
                <tr>
                  <th scope="col">Expense</th>
                  <th scope="col">Category</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Payment</th>
                  <th scope="col">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {event.expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <strong>{expense.name}</strong>
                    </td>
                    <td>
                      <span className="category-pill">{expense.category}</span>
                    </td>
                    <td>{money(expense.amount)}</td>
                    <td>
                      <button
                        className={`status-pill ${expense.paid ? "green" : "peach"}`}
                        aria-label={`Mark ${expense.name} as ${expense.paid ? "unpaid" : "paid"}`}
                        aria-pressed={expense.paid}
                        onClick={() =>
                          update((e) => ({
                            ...e,
                            expenses: e.expenses.map((x) =>
                              x.id === expense.id ? { ...x, paid: !x.paid } : x,
                            ),
                          }))
                        }
                      >
                        {expense.paid ? (
                          <Check size={12} />
                        ) : (
                          <Clock3 size={12} />
                        )}{" "}
                        {expense.paid ? "Paid" : "Unpaid"}
                      </button>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${expense.name}`}
                        onClick={() => openItem("expense", expense)}
                      >
                        <MoreHorizontal size={19} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Wallet />}
            title="Make room for your first little detail."
            description="Add your first expense. We’ll keep the numbers together."
            action={() => openItem("expense")}
            label="Add an expense"
          />
        )}
      </section>
    </>
  );
}
