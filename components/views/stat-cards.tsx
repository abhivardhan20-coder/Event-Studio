"use client";
import {
  budgetTotals,
  dateLabel,
  daysUntil,
  money,
  type Celebration,
  type Tab,
} from "@/lib/planner";
import {
  ArrowUpRight,
  CalendarDays,
  ListChecks,
  Users,
  Wallet,
} from "lucide-react";

export function StatCards({
  event,
  go,
}: {
  event: Celebration;
  go?: (tab: Tab) => void;
}) {
  const spent = budgetTotals(event).recorded,
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
