"use client";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  CheckCheck,
  Clock3,
  Flower2,
  Heart,
  Leaf,
  ListChecks,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import {
  budgetAllocations,
  dateLabel,
  daysUntil,
  money,
  relativeDate,
  type Celebration,
  type Guest,
  type Idea,
  type Tab,
  type Vendor,
} from "@/lib/planner";
import type { ItemKind } from "./planner-app";
import { EmptyState, SectionHeader, downloadFile } from "./ui";
type OpenItem = (
  kind: ItemKind,
  item?:
    | Celebration["tasks"][number]
    | Celebration["expenses"][number]
    | Vendor
    | Guest,
) => void;
type Update = (updater: (event: Celebration) => Celebration) => void;

export function StatCards({
  event,
  go,
}: {
  event: Celebration;
  go?: (tab: Tab) => void;
}) {
  const spent = event.expenses.reduce((s, e) => s + e.amount, 0),
    completed = event.tasks.filter((t) => t.done).length,
    confirmed = event.guests.filter((g) => g.rsvp === "Confirmed").length,
    days = daysUntil(event.date);
  return (
    <div className="stat-grid">
      <button className="stat-card" onClick={() => go?.("Budget")}>
        <div className="stat-top">
          <span>Budget at a glance</span>
          <span className="stat-icon sage">
            <Wallet size={18} />
          </span>
        </div>
        <div className="stat-number">
          {money(spent)}
          <small> / {money(event.budget)}</small>
        </div>
        <div className="stat-bottom">
          <span className={spent > event.budget ? "danger-text" : "green-text"}>
            {money(Math.abs(event.budget - spent))}{" "}
            {spent > event.budget ? "over budget" : "left to make magic"}
          </span>
          <ArrowUpRight size={15} />
        </div>
      </button>
      <button className="stat-card" onClick={() => go?.("Guest list")}>
        <div className="stat-top">
          <span>Your favorite people</span>
          <span className="stat-icon peach">
            <Users size={18} />
          </span>
        </div>
        <div className="stat-number">
          {event.guestCount}
          <small> guests expected</small>
        </div>
        <div className="stat-bottom">
          <span>
            <strong>{confirmed}</strong> confirmed · {event.guests.length} on
            your list
          </span>
          <ArrowUpRight size={15} />
        </div>
      </button>
      <button className="stat-card" onClick={() => go?.("Timeline")}>
        <div className="stat-top">
          <span>Little things, getting done</span>
          <span className="stat-icon lavender">
            <ListChecks size={18} />
          </span>
        </div>
        <div className="stat-number">
          {completed}
          <small> / {event.tasks.length} tasks complete</small>
        </div>
        <div className="stat-bottom">
          <span>You’ve got this, one step at a time.</span>
          <ArrowUpRight size={15} />
        </div>
      </button>
      <button className="stat-card" onClick={() => go?.("Timeline")}>
        <div className="stat-top">
          <span>The happy countdown</span>
          <span className="stat-icon sand">
            <CalendarDays size={18} />
          </span>
        </div>
        <div className="stat-number">
          {Math.abs(days)}
          <small>
            {" "}
            {days < 0
              ? "days of memories"
              : days === 0
                ? "it’s celebration day!"
                : "days to celebrate"}
          </small>
        </div>
        <div className="stat-bottom">
          <span>
            {dateLabel(event.date)}
            <span className="countdown-heart"> ♡</span>
          </span>
          <ArrowUpRight size={15} />
        </div>
      </button>
    </div>
  );
}

export function BudgetChart({
  event,
  compact = false,
}: {
  event: Celebration;
  compact?: boolean;
}) {
  const allocations = budgetAllocations(event),
    total = event.expenses.reduce((sum, e) => sum + e.amount, 0),
    percent = Math.round((total / event.budget) * 100);
  let cursor = 0;
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
          {allocations.map((row) => {
            const share = (row.spent / denominator) * 402.124,
              offset = cursor;
            cursor += share;
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

function IdeaCards({
  ideas,
  saveIdea,
  openIdea,
}: {
  ideas: Idea[];
  saveIdea: (id: string) => void;
  openIdea: (idea: Idea) => void;
}) {
  return (
    <div className="ideas-grid">
      {ideas.map((idea, i) => (
        <article className="idea-card" key={idea.id}>
          <div className="idea-image-wrap">
            <button
              className="idea-image-button"
              onClick={() => openIdea(idea)}
              aria-label={`Explore ${idea.title}`}
            >
              <img
                src={idea.image}
                alt={idea.title}
                loading="lazy"
                style={{ objectPosition: i === 1 ? "50% 58%" : "center" }}
              />
            </button>
            <button
              className={`bookmark-button ${idea.saved ? "saved" : ""}`}
              onClick={() => saveIdea(idea.id)}
              aria-label={
                idea.saved ? `Unsave ${idea.title}` : `Save ${idea.title}`
              }
              aria-pressed={idea.saved}
            >
              <Bookmark
                size={17}
                strokeWidth={1.6}
                fill={idea.saved ? "currentColor" : "none"}
              />
            </button>
            <span className="idea-tag">{idea.tag}</span>
          </div>
          <button className="idea-card-body" onClick={() => openIdea(idea)}>
            <h3>{idea.title}</h3>
            <span>
              A little inspiration for your celebration
              <ArrowUpRight size={16} />
            </span>
          </button>
        </article>
      ))}
    </div>
  );
}

export function Overview({
  event,
  go,
  toggleTask,
  openItem,
  saveIdea,
  openIdea,
  ask,
}: {
  event: Celebration;
  go: (tab: Tab) => void;
  toggleTask: (id: string) => void;
  openItem: OpenItem;
  saveIdea: (id: string) => void;
  openIdea: (idea: Idea) => void;
  ask: (prompt?: string) => void;
}) {
  const upcoming = event.tasks
    .filter((t) => !t.done)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  return (
    <>
      <StatCards event={event} go={go} />
      <div className="overview-grid">
        <section className="panel upcoming-panel">
          <SectionHeader
            title="A few things up next"
            description="Small steps toward your big day."
            action={() => go("Timeline")}
            actionLabel="View timeline"
          />
          <div className="upcoming-list">
            {upcoming.map((task) => (
              <div className="upcoming-row" key={task.id}>
                <button
                  className="task-checkbox"
                  onClick={() => toggleTask(task.id)}
                  aria-label={`Complete ${task.title}`}
                />
                <button
                  className="task-description"
                  onClick={() => openItem("task", task)}
                >
                  <strong>{task.title}</strong>
                  <span>{task.category}</span>
                </button>
                <span
                  className={`due-tag ${daysUntil(task.date) <= 0 ? "due-today" : ""}`}
                >
                  {relativeDate(task.date)}
                </span>
              </div>
            ))}
            {upcoming.length === 0 && (
              <div className="all-done">
                <CheckCheck size={30} />
                <p>All caught up. Enjoy the anticipation.</p>
              </div>
            )}
          </div>
          <button className="add-task-inline" onClick={() => openItem("task")}>
            <Plus size={15} />
            Add a little to-do
          </button>
        </section>
        <section className="panel budget-panel">
          <SectionHeader
            title="Room for a little magic"
            description="Your budget, beautifully in balance."
            action={() => go("Budget")}
            actionLabel="Details"
          />
          <BudgetChart event={event} compact />
          <div className="budget-panel-note">
            <span className="online-dot" />
            {event.expenses.reduce((s, e) => s + e.amount, 0) <= event.budget
              ? "Looking good! Your plans are within budget."
              : "A little rebalancing will bring things back on track."}
          </div>
        </section>
      </div>
      <section className="inspiration-section">
        <SectionHeader
          title="A little inspiration, just for you"
          description="Thoughtful ideas for a celebration that feels like you."
          action={() => go("Inspiration")}
          actionLabel="Explore ideas"
        />
        <IdeaCards
          ideas={event.ideas.slice(0, 3)}
          saveIdea={saveIdea}
          openIdea={openIdea}
        />
      </section>
      <div className="thoughtful-banner">
        <span className="thoughtful-icon">
          <Sparkles size={23} strokeWidth={1.5} />
        </span>
        <div>
          <h3>The best celebrations feel like you.</h3>
          <p>Tell us what you love. We’ll help with the rest.</p>
        </div>
        <button
          onClick={() =>
            ask("Suggest three personal touches based on my event's vibe")
          }
        >
          Find my little spark
          <ArrowRight size={16} />
        </button>
        <Flower2 className="banner-flower" size={90} strokeWidth={0.6} />
      </div>
    </>
  );
}

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
  const allocations = budgetAllocations(event),
    total = event.expenses.reduce((s, e) => s + e.amount, 0),
    paid = event.expenses
      .filter((e) => e.paid)
      .reduce((s, e) => s + e.amount, 0);
  return (
    <>
      <div className="budget-summary-grid">
        <div className="panel total-budget">
          <span className="eyebrow">YOUR CELEBRATION BUDGET</span>
          <strong>{money(event.budget)}</strong>
          <span>{money(event.budget - total)} remaining</span>
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
              <strong>{money(total - paid)}</strong>
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
            {money(total - event.budget)}. Review your biggest categories or
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
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>
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

export function TimelineView({
  event,
  toggleTask,
  openItem,
  notify,
}: {
  event: Celebration;
  toggleTask: (id: string) => void;
  openItem: OpenItem;
  notify: (message: string) => void;
}) {
  const [filter, setFilter] = useState("All tasks");
  const filtered = event.tasks
    .filter((t) =>
      filter === "All tasks" ? true : filter === "Completed" ? t.done : !t.done,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const completed = event.tasks.filter((t) => t.done).length;
  const exportCalendar = () => {
    const escape = (s: string) =>
      s
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
    const dtstamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Gather//Event Planner//EN",
      ...event.tasks.flatMap((t) => [
        "BEGIN:VEVENT",
        `UID:${t.id}@gather`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${t.date.replace(/-/g, "")}`,
        `SUMMARY:${escape(t.title)}`,
        `DESCRIPTION:${escape(event.name)}`,
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ].join("\r\n");
    downloadFile(content, "gather-timeline.ics", "text/calendar");
    notify("Timeline downloaded. Import it into your calendar.");
  };
  return (
    <>
      <div className="timeline-summary panel">
        <div className="timeline-summary-icon">
          <ListChecks size={28} strokeWidth={1.5} />
        </div>
        <div>
          <h2>
            {completed === event.tasks.length && event.tasks.length
              ? "You did all the little things."
              : "Big days are made of small steps."}
          </h2>
          <p>
            {completed} of {event.tasks.length} tasks complete. There’s no rush
            to do it all at once.
          </p>
        </div>
        <div className="timeline-ring">
          {event.tasks.length
            ? Math.round((completed / event.tasks.length) * 100)
            : 0}
          <span>% done</span>
        </div>
      </div>
      <section className="panel">
        <div className="view-toolbar">
          <div className="filter-tabs">
            {["All tasks", "Upcoming", "Completed"].map((f) => (
              <button
                className={f === filter ? "selected" : ""}
                key={f}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="toolbar-buttons">
            <button className="button secondary small" onClick={exportCalendar}>
              <CalendarDays size={15} />
              Export calendar
            </button>
            <button
              className="button primary small"
              onClick={() => openItem("task")}
            >
              <Plus size={15} />
              Add task
            </button>
          </div>
        </div>
        <div className="timeline-list">
          {filtered.map((task, index) => (
            <div
              key={task.id}
              className={`timeline-row ${task.done ? "completed" : ""}`}
            >
              <span className="timeline-date">
                <strong>{new Date(task.date + "T12:00:00").getDate()}</strong>
                <small>
                  {new Date(task.date + "T12:00:00").toLocaleDateString(
                    "en-IN",
                    { month: "short" },
                  )}
                </small>
              </span>
              <button
                className={`task-checkbox ${task.done ? "checked" : ""}`}
                onClick={() => toggleTask(task.id)}
                aria-label={`${task.done ? "Reopen" : "Complete"} ${task.title}`}
              >
                {task.done && <Check size={14} />}
              </button>
              <button
                className="task-description"
                onClick={() => openItem("task", task)}
              >
                <strong>{task.title}</strong>
                <span>{task.category}</span>
              </button>
              <span
                className={`due-tag ${!task.done && daysUntil(task.date) <= 0 ? "due-today" : ""}`}
              >
                {task.done ? "All done" : relativeDate(task.date)}
              </span>
              <button
                className="icon-button"
                aria-label={`Edit ${task.title}`}
                onClick={() => openItem("task", task)}
              >
                <MoreHorizontal size={19} />
              </button>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <EmptyState
            icon={<CheckCheck />}
            title={
              filter === "Completed"
                ? "Your first little win is coming."
                : "A lovely clean slate."
            }
            description={
              filter === "Completed"
                ? "Check off a task to see it here."
                : "Add a task to take the next step toward your celebration."
            }
            action={() => openItem("task")}
            label="Add a task"
          />
        )}
      </section>
    </>
  );
}

export function VendorsView({
  event,
  update,
  openItem,
}: {
  event: Celebration;
  update: Update;
  openItem: OpenItem;
}) {
  const [filter, setFilter] = useState("All vendors");
  const filtered = event.vendors.filter(
    (v) => filter === "All vendors" || v.status === filter,
  );
  const checklistLabels = [
    "Request a detailed quote",
    "Review portfolio & references",
    "Confirm scope & contract",
    "Pay deposit & confirm booking",
  ];
  return (
    <>
      <div className="note">
        <Leaf size={22} />
        <p>
          <strong>Good people make great celebrations.</strong> Add your own
          vendors, compare quotes, and keep every conversation moving.{" "}
          {event.source === "sample" &&
            "The vendors below are sample planning entries."}
        </p>
      </div>
      <div className="view-toolbar standalone">
        <div className="filter-tabs">
          {["All vendors", "To contact", "Shortlisted", "Booked"].map((f) => (
            <button
              key={f}
              className={filter === f ? "selected" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          className="button primary small"
          onClick={() => openItem("vendor")}
        >
          <Plus size={16} />
          Add vendor
        </button>
      </div>
      {filtered.length ? (
        <div className="vendor-grid">
          {filtered.map((v) => (
            <article className="panel vendor-card" key={v.id}>
              <div className="vendor-card-top">
                <span className="vendor-icon">
                  <Store size={23} strokeWidth={1.4} />
                </span>
                <button
                  className="icon-button"
                  aria-label={`Edit ${v.name}`}
                  onClick={() => openItem("vendor", v)}
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>
              <span className="eyebrow">{v.category}</span>
              <h2>{v.name}</h2>
              <p className="vendor-contact">
                {v.contact || "No contact details yet"}
              </p>
              <div className="vendor-quote">
                <span>Quoted amount</span>
                <strong>{v.quote ? money(v.quote) : "Awaiting quote"}</strong>
              </div>
              <label className="vendor-status-label">
                <span>Booking status</span>
                <select
                  value={v.status}
                  onChange={(ev) =>
                    update((e) => ({
                      ...e,
                      vendors: e.vendors.map((x) =>
                        x.id === v.id
                          ? {
                              ...x,
                              status: ev.target.value as Vendor["status"],
                            }
                          : x,
                      ),
                    }))
                  }
                >
                  {["To contact", "Contacted", "Shortlisted", "Booked"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </label>
              <div className="vendor-checklist">
                {checklistLabels.map((label, i) => (
                  <label key={label}>
                    <input
                      type="checkbox"
                      checked={v.checklist[i]}
                      onChange={() =>
                        update((e) => ({
                          ...e,
                          vendors: e.vendors.map((x) =>
                            x.id === v.id
                              ? {
                                  ...x,
                                  checklist: x.checklist.map((checked, j) =>
                                    j === i ? !checked : checked,
                                  ),
                                }
                              : x,
                          ),
                        }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            icon={<Store />}
            title="Your dream team starts here."
            description="Add a vendor and keep quotes, contacts and booking details together."
            action={() => openItem("vendor")}
            label="Add your first vendor"
          />
        </div>
      )}
      <div className="note muted-note">
        <Sparkles size={18} />
        <p>
          Vendor quotes are estimates. Record confirmed expenses in Budget to
          include them in your spending totals.
        </p>
      </div>
    </>
  );
}

export function GuestsView({
  event,
  update,
  openItem,
}: {
  event: Celebration;
  update: Update;
  openItem: OpenItem;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All guests");
  const filtered = event.guests.filter(
    (g) =>
      (filter === "All guests" || g.rsvp === filter) &&
      `${g.name} ${g.group} ${g.email}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="guest-stats">
        {[
          {
            label: "On your guest list",
            value: event.guests.length,
            icon: Users,
          },
          {
            label: "Ready to celebrate",
            value: event.guests.filter((g) => g.rsvp === "Confirmed").length,
            icon: CheckCheck,
          },
          {
            label: "Waiting to hear back",
            value: event.guests.filter((g) => g.rsvp === "Pending").length,
            icon: Mail,
          },
        ].map((s) => (
          <div className="panel guest-stat" key={s.label}>
            <span className="stat-icon sage">
              <s.icon size={22} />
            </span>
            <div>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="view-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a familiar face…"
              aria-label="Search guests"
            />
          </div>
          <div className="toolbar-buttons">
            <select
              className="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["All guests", "Confirmed", "Pending", "Declined"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              className="button primary small"
              onClick={() => openItem("guest")}
            >
              <Plus size={16} />
              Add guest
            </button>
          </div>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Your people</th>
                  <th>Group</th>
                  <th>RSVP</th>
                  <th>A little to remember</th>
                  <th>
                    <span className="sr-only">Edit guest</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div className="guest-name">
                        <span className="guest-avatar">
                          {g.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <span>
                          <strong>{g.name}</strong>
                          <small>{g.email || "No email added"}</small>
                        </span>
                      </div>
                    </td>
                    <td>{g.group}</td>
                    <td>
                      <select
                        className={`rsvp-select ${g.rsvp.toLowerCase()}`}
                        value={g.rsvp}
                        aria-label={`RSVP for ${g.name}`}
                        onChange={(ev) =>
                          update((e) => ({
                            ...e,
                            guests: e.guests.map((x) =>
                              x.id === g.id
                                ? {
                                    ...x,
                                    rsvp: ev.target.value as Guest["rsvp"],
                                  }
                                : x,
                            ),
                          }))
                        }
                      >
                        {["Pending", "Confirmed", "Declined"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>{g.dietary || "—"}</td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${g.name}`}
                        onClick={() => openItem("guest", g)}
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
            icon={<Users />}
            title={
              query
                ? "No familiar faces found."
                : "Make room for your favorite people."
            }
            description={
              query
                ? "Try another name or change your RSVP filter."
                : "Add guests, track RSVPs and remember the details that matter."
            }
            action={() => openItem("guest")}
            label="Add a guest"
          />
        )}
      </section>
      <div className="note muted-note">
        <Heart size={18} />
        <p>
          Your guest list stays in this browser. Contact details are never sent
          to the AI assistant.
        </p>
      </div>
    </>
  );
}

export function InspirationView({
  event,
  savedOnly,
  setSavedOnly,
  saveIdea,
  openIdea,
  ask,
}: {
  event: Celebration;
  savedOnly: boolean;
  setSavedOnly: (value: boolean) => void;
  saveIdea: (id: string) => void;
  openIdea: (idea: Idea) => void;
  ask: (prompt: string) => void;
}) {
  const ideas = event.ideas.filter((i) => !savedOnly || i.saved);
  return (
    <>
      <div className="inspiration-intro">
        <span className="inspiration-icon">
          <Sparkles size={29} strokeWidth={1.3} />
        </span>
        <div>
          <span className="eyebrow">INSPIRED BY YOUR KIND OF CELEBRATION</span>
          <h2>{event.vibe || "Thoughtful moments. Beautiful memories."}</h2>
          <p>
            {event.source === "gemini"
              ? "Personalized with Gemini"
              : "A thoughtful starting point, made for your event"}{" "}
            · {event.type} · {event.location}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            ask(
              "Give me three fresh personalized ideas for my celebration, with practical steps and estimated costs",
            )
          }
        >
          Find more ideas
          <Sparkles size={16} />
        </button>
      </div>
      <div className="view-toolbar standalone">
        <div className="filter-tabs">
          <button
            className={!savedOnly ? "selected" : ""}
            onClick={() => setSavedOnly(false)}
          >
            All inspiration
          </button>
          <button
            className={savedOnly ? "selected" : ""}
            onClick={() => setSavedOnly(true)}
          >
            Saved ideas <span>{event.ideas.filter((i) => i.saved).length}</span>
          </button>
        </div>
        <span className="subtle-text">
          A few thoughtful touches go a long way.
        </span>
      </div>
      {ideas.length ? (
        <IdeaCards ideas={ideas} saveIdea={saveIdea} openIdea={openIdea} />
      ) : (
        <div className="panel">
          <EmptyState
            icon={<Bookmark />}
            title="Keep the ideas that make you smile."
            description="Tap the bookmark on any idea and it will be waiting here."
            action={() => setSavedOnly(false)}
            label="Explore inspiration"
          />
        </div>
      )}
      <div className="thoughtful-banner">
        <span className="thoughtful-icon">
          <Leaf size={25} />
        </span>
        <div>
          <h3>Make it personal. Make it meaningful.</h3>
          <p>The best little details tell your story.</p>
        </div>
        <button
          onClick={() =>
            ask("Help me create a unique, budget-conscious theme for my event")
          }
        >
          Dream up a theme
          <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
