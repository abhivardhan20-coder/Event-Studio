"use client";
import { exportCalendar as calendarFile } from "@/lib/calendar";
import { daysUntil, relativeDate, type Celebration } from "@/lib/planner";
import {
  CalendarDays,
  Check,
  CheckCheck,
  ListChecks,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { EmptyState, downloadFile } from "../ui";
import type { OpenItem } from "./types";

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
    const content = calendarFile(event);
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
                aria-pressed={f === filter}
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
          {filtered.map((task) => (
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
                role="checkbox"
                aria-checked={task.done}
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
