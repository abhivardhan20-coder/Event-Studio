"use client";
import {
  budgetTotals,
  daysUntil,
  relativeDate,
  type Celebration,
  type Idea,
  type Tab,
} from "@/lib/planner";
import { ArrowRight, CheckCheck, Flower2, Plus, Sparkles } from "lucide-react";
import { SectionHeader } from "../ui";
import { BudgetChart } from "./budget-chart";
import { IdeaCards } from "./idea-cards";
import { StatCards } from "./stat-cards";
import type { OpenItem } from "./types";

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
      <section
        className="plan-summary panel"
        aria-label="Personalized event plan"
      >
        <span className="eyebrow">
          {event.source === "gemini"
            ? "YOUR GEMINI PLAN"
            : event.source === "sample"
              ? "EXAMPLE PLAN"
              : "YOUR CELEBRATION PLAN"}
        </span>
        <h2>A celebration that feels like you</h2>
        <p>{event.summary}</p>
      </section>
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
                  role="checkbox"
                  aria-checked={false}
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
            {budgetTotals(event).recorded <= event.budget
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
