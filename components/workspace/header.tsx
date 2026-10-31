"use client";
import { dateLabel, daysUntil } from "@/lib/planner";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronRight,
  Heart,
  Menu,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";

import type { ReadyWorkspace } from "@/hooks/use-workspace-controller";

export function WorkspaceTopbar({ workspace }: { workspace: ReadyWorkspace }) {
  const {
    store,
    tab,
    sidebarOpen,
    setSidebarOpen,
    persisted,
    upcoming,
    setModal,
  } = workspace;
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <button
          className="icon-button mobile-menu"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={sidebarOpen}
          aria-controls="planning-navigation"
          onClick={() => setSidebarOpen((value) => !value)}
        >
          <Menu size={22} />
        </button>
        <span>My workspace</span>
        <ChevronRight size={13} />
        <strong>{tab}</strong>
      </div>
      <div className="topbar-actions">
        <span className="save-status">
          <span />
          {persisted
            ? "All changes saved locally"
            : "Unsaved · download a backup"}
        </span>
        <button
          className="icon-button notification-button"
          aria-label="View upcoming reminders"
          onClick={() => setModal("notifications")}
        >
          <Bell size={19} />
          {upcoming.length > 0 && <i />}
        </button>
        <span className="topbar-divider" />
        <button
          className="avatar topbar-avatar"
          onClick={() => setModal("settings")}
          aria-label={`${store.profile.slice(0, 2).toUpperCase()} · Profile settings`}
        >
          {store.profile.slice(0, 2).toUpperCase()}
        </button>
      </div>
    </header>
  );
}
export function WorkspaceIntro({ workspace }: { workspace: ReadyWorkspace }) {
  const {
    event,
    store,
    tab,
    savedOnly,
    headingRef,
    warning,
    setModal,
    ask,
    progress,
    upcoming,
    switchEvent,
  } = workspace;
  const eventIcon =
    event.type === "Wedding" ? (
      <Heart size={19} />
    ) : event.type === "Birthday" ? (
      <Sparkles size={19} />
    ) : (
      <Users size={19} />
    );
  return (
    <>
      {warning && (
        <div className="storage-warning" role="alert">
          {warning}{" "}
          <button className="text-button" onClick={() => setModal("settings")}>
            Open Settings
          </button>
        </div>
      )}
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h1 ref={headingRef} tabIndex={-1}>
            {tab === "Overview" ? (
              <>
                Good things are coming, {store.profile}
                <span className="heading-period">.</span>
              </>
            ) : tab === "Inspiration" ? (
              savedOnly ? (
                "Your little collection."
              ) : (
                "A little spark of inspiration."
              )
            ) : tab === "Budget" ? (
              "Make every little detail count."
            ) : tab === "Timeline" ? (
              "One lovely step at a time."
            ) : tab === "Vendors" ? (
              "Your dream team, together."
            ) : (
              "Good company. Great memories."
            )}
          </h1>
          <p>
            {tab === "Overview"
              ? "A little less planning. A little more looking forward."
              : tab === "Budget"
                ? "A clear picture of your spending, with room for a little magic."
                : tab === "Timeline"
                  ? "The big moments and the tiny details, all in one happy place."
                  : tab === "Vendors"
                    ? "Keep the people behind your celebration on the same page."
                    : tab === "Guest list"
                      ? "Every celebration starts with the people you love."
                      : "Thoughtful touches to make your celebration feel like you."}
          </p>
        </div>
        <button
          className="button primary new-event"
          onClick={() => setModal("event")}
        >
          <Plus size={17} />
          Create an event
        </button>
      </div>
      {tab === "Overview" && (
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-kicker">
              <span />
              FOR THE MOMENTS THAT MATTER
            </span>
            <h2>
              A little planning.
              <br />A lot of <em>magic.</em>
              <Sparkles className="hero-sparkles" size={30} strokeWidth={1} />
            </h2>
            <p>
              From your first idea to the final happy dance,
              <br />
              let’s bring your celebration to life.
            </p>
            <button
              className="button hero-button"
              onClick={() => ask("Help me plan my next steps")}
            >
              Let’s make it special
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div
            className="hero-photo"
            style={{
              backgroundImage: `url(${event.type === "Birthday" ? "/images/birthday.jpg" : event.type === "Community" ? "/images/community.jpg" : "/images/wedding.jpg"})`,
            }}
          />
          <div className="hero-sticker">
            <Heart size={18} strokeWidth={1.3} />
            <span>
              made for
              <br />
              <em>memories</em>
            </span>
          </div>
          <span className="hero-caption">
            A moment to remember. A plan to get you there.
          </span>
        </section>
      )}
      <section className="event-strip">
        <div className="event-strip-icon">{eventIcon}</div>
        <div className="event-strip-main">
          <div className="event-title">
            <h2>{event.name}</h2>
            {event.source === "sample" && (
              <span className="sample-tag">SAMPLE EVENT</span>
            )}
          </div>
          <div className="event-meta">
            <span>
              <CalendarDays size={13} />
              {dateLabel(event.date)}
            </span>
            <i>·</i>
            <span>{event.location}</span>
            <i>·</i>
            <span>{event.type}</span>
          </div>
        </div>
        <div className="event-progress">
          <span>
            Your plan is coming together <strong>{progress}%</strong>
          </span>
          <div className="progress-track">
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span
          className={`status-pill ${upcoming.some((t) => daysUntil(t.date) < 0) ? "peach" : "green"}`}
        >
          <span />
          {upcoming.some((t) => daysUntil(t.date) < 0)
            ? "Needs a little love"
            : "On track"}
        </span>
        <div className="event-switch">
          <label className="sr-only" htmlFor="event-select">
            Switch event
          </label>
          <select
            id="event-select"
            value={event.id}
            onChange={(e) => switchEvent(e.target.value)}
          >
            {store.events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label="Edit event details"
            onClick={() => setModal("edit-event")}
          >
            <ChevronRight size={19} />
          </button>
        </div>
      </section>
    </>
  );
}
