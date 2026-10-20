"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  Flower2,
  Heart,
  LayoutGrid,
  Leaf,
  Menu,
  Plus,
  Settings,
  Sparkles,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  seedStore,
  storeSchema,
  dateLabel,
  daysUntil,
  exportPlan,
  type Celebration,
  type PlannerStore,
  type Tab,
  type Idea,
  type Task,
  type Expense,
  type Vendor,
  type Guest,
} from "@/lib/planner";
import {
  Overview,
  BudgetView,
  TimelineView,
  VendorsView,
  GuestsView,
  InspirationView,
} from "./views";
import { EventForm, ItemForm, SettingsForm } from "./forms";
import { Assistant } from "./assistant";
import { Modal, downloadFile } from "./ui";

const navigation: { name: Tab; icon: typeof LayoutGrid }[] = [
  { name: "Overview", icon: LayoutGrid },
  { name: "Budget", icon: Wallet },
  { name: "Timeline", icon: CalendarDays },
  { name: "Vendors", icon: Store },
  { name: "Guest list", icon: Users },
];
export type ItemKind = "task" | "expense" | "vendor" | "guest";
type ModalKind =
  | "event"
  | "edit-event"
  | "settings"
  | "help"
  | "notifications"
  | ItemKind
  | null;
const STORAGE_KEY = "gather-planner-v1";

export default function PlannerApp() {
  const [store, setStore] = useState<PlannerStore | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [modal, setModal] = useState<ModalKind>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [toast, setToast] = useState("");
  const [idea, setIdea] = useState<Idea | null>(null);
  const [editing, setEditing] = useState<
    Task | Expense | Vendor | Guest | undefined
  >();
  const [savedOnly, setSavedOnly] = useState(false);
  const [liveAI, setLiveAI] = useState(false);
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored = raw ? storeSchema.parse(JSON.parse(raw)) : seedStore();
      if (!stored.events.length) setStore(seedStore());
      else
        setStore({
          ...stored,
          activeId: stored.events.some((e) => e.id === stored.activeId)
            ? stored.activeId
            : stored.events[0].id,
        });
    } catch {
      setStore(seedStore());
      setToast("We couldn't read your saved plan. A fresh example is ready.");
    }
    fetch("/api/plan")
      .then((r) => r.json())
      .then((data) =>
        setLiveAI(
          typeof data === "object" &&
            data !== null &&
            "configured" in data &&
            data.configured === true,
        ),
      )
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (store)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      } catch {
        setToast("Browser storage is full. Export your plan to keep a copy.");
      }
  }, [store]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const closeModal = useCallback(() => {
    setModal(null);
    setEditing(undefined);
  }, []);
  const closeIdea = useCallback(() => setIdea(null), []);
  const event =
    store?.events.find((e) => e.id === store.activeId) ?? store?.events[0];
  const update = useCallback(
    (updater: (event: Celebration) => Celebration) =>
      setStore((current) =>
        current
          ? {
              ...current,
              events: current.events.map((e) =>
                e.id === current.activeId ? updater(e) : e,
              ),
            }
          : current,
      ),
    [],
  );
  const openItem = (kind: ItemKind, item?: Task | Expense | Vendor | Guest) => {
    setEditing(item);
    setModal(kind);
  };
  const go = (next: Tab) => {
    setTab(next);
    setSavedOnly(false);
    setSidebarOpen(false);
  };
  const ask = (prompt = "") => {
    setAssistantPrompt(prompt);
    setAssistantOpen(true);
    setSidebarOpen(false);
  };
  const toggleTask = (id: string) =>
    update((e) => ({
      ...e,
      tasks: e.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  const saveIdea = (id: string) =>
    update((e) => ({
      ...e,
      ideas: e.ideas.map((i) => (i.id === id ? { ...i, saved: !i.saved } : i)),
    }));
  if (!store || !event)
    return (
      <div className="app-loading">
        <Flower2 size={46} />
        <span>
          gather<span className="brand-dot">.</span>
        </span>
        <p>Making room for your next beautiful moment…</p>
      </div>
    );
  const completed = event.tasks.filter((t) => t.done).length;
  const progress = event.tasks.length
    ? Math.round((completed / event.tasks.length) * 100)
    : 0;
  const upcoming = event.tasks
    .filter((t) => !t.done)
    .sort((a, b) => a.date.localeCompare(b.date));
  const saved = event.ideas.filter((i) => i.saved).length;
  const eventIcon =
    event.type === "Wedding" ? (
      <Heart size={19} />
    ) : event.type === "Birthday" ? (
      <Sparkles size={19} />
    ) : (
      <Users size={19} />
    );
  const createOrUpdate = (next: Celebration) => {
    setStore((current) =>
      current
        ? {
            ...current,
            activeId: next.id,
            events:
              modal === "edit-event"
                ? current.events.map((e) => (e.id === next.id ? next : e))
                : [...current.events, next],
          }
        : current,
    );
    setTab("Overview");
    closeModal();
    notify(
      modal === "edit-event"
        ? "Your event details are updated."
        : `Your ${next.type.toLowerCase()} plan is ready. Let's make it special.`,
    );
  };
  const itemSave = (kind: ItemKind, value: Task | Expense | Vendor | Guest) => {
    update((e) => {
      const key = {
        task: "tasks",
        expense: "expenses",
        vendor: "vendors",
        guest: "guests",
      }[kind] as "tasks" | "expenses" | "vendors" | "guests";
      const list = e[key] as { id: string }[];
      return {
        ...e,
        [key]: editing
          ? list.map((item) => (item.id === value.id ? value : item))
          : [...list, value],
      };
    });
    closeModal();
    notify(
      `${kind[0].toUpperCase() + kind.slice(1)} ${editing ? "updated" : "added"}. One less thing to think about.`,
    );
  };
  const removeItem = (kind: ItemKind, id: string) => {
    update((e) => {
      const key = {
        task: "tasks",
        expense: "expenses",
        vendor: "vendors",
        guest: "guests",
      }[kind] as "tasks" | "expenses" | "vendors" | "guests";
      return {
        ...e,
        [key]: (e[key] as { id: string }[]).filter((x) => x.id !== id),
      };
    });
    closeModal();
    notify("Removed from your plan.");
  };
  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("Overview");
          }}
          aria-label="Gather home"
        >
          <span className="brand-flower">
            <Flower2 size={31} strokeWidth={1.4} />
          </span>
          gather<span className="brand-dot">.</span>
        </a>
        <span className="brand-caption">Good things come together.</span>
        <div className="workspace-label">
          <span className="workspace-icon">A</span>
          <div>
            My workspace<small>Your space to celebrate</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-label">LET'S MAKE IT HAPPEN</span>
        <nav aria-label="Planning tools">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${tab === name ? "active" : ""}`}
              onClick={() => go(name)}
            >
              <Icon size={19} strokeWidth={1.65} />
              <span>{name}</span>
              {name === "Overview" && <span className="nav-active-dot" />}
              {name === "Guest list" && (
                <span className="nav-count">{event.guests.length}</span>
              )}
            </button>
          ))}
        </nav>
        <span className="nav-label second-label">A LITTLE INSPIRATION</span>
        <button
          className={`nav-item ${tab === "Inspiration" && !savedOnly ? "active" : ""}`}
          onClick={() => go("Inspiration")}
        >
          <Leaf size={19} strokeWidth={1.65} />
          <span>Ideas & inspiration</span>
        </button>
        <button
          className={`nav-item ${tab === "Inspiration" && savedOnly ? "active" : ""}`}
          onClick={() => {
            go("Inspiration");
            setSavedOnly(true);
          }}
        >
          <Bookmark size={19} strokeWidth={1.65} />
          <span>Saved ideas</span>
          {saved > 0 && <span className="nav-count">{saved}</span>}
        </button>
        <div className="sidebar-bottom">
          <div className="assistant-card">
            <div className="assistant-mini-stars">
              <Sparkles size={24} />
              <span className="tiny-spark">✧</span>
            </div>
            <h3>A little help, a lot of heart.</h3>
            <p>
              Big ideas. Small details.
              <br />
              Your planning companion has it.
            </p>
            <button onClick={() => ask()}>
              Meet your AI assistant
              <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setModal("help")}>
            <CircleHelp size={18} />
            <span>A helping hand</span>
          </button>
          <button className="nav-item" onClick={() => setModal("settings")}>
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <div className="sidebar-footer">
            <span className="avatar">
              {store.profile.slice(0, 2).toUpperCase()}
            </span>
            <div>
              {store.profile}
              <small>Celebration enthusiast</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
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
              All changes saved locally
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
              aria-label="Profile settings"
            >
              {store.profile.slice(0, 2).toUpperCase()}
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
              <h1>
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
                  <Sparkles
                    className="hero-sparkles"
                    size={30}
                    strokeWidth={1}
                  />
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
                onChange={(e) =>
                  setStore({ ...store, activeId: e.target.value })
                }
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
          {tab === "Overview" && (
            <Overview
              event={event}
              go={go}
              toggleTask={toggleTask}
              openItem={openItem}
              saveIdea={saveIdea}
              openIdea={setIdea}
              ask={ask}
            />
          )}
          {tab === "Budget" && (
            <BudgetView
              event={event}
              update={update}
              openItem={openItem}
              ask={ask}
            />
          )}
          {tab === "Timeline" && (
            <TimelineView
              event={event}
              toggleTask={toggleTask}
              openItem={openItem}
              notify={notify}
            />
          )}
          {tab === "Vendors" && (
            <VendorsView event={event} update={update} openItem={openItem} />
          )}
          {tab === "Guest list" && (
            <GuestsView event={event} update={update} openItem={openItem} />
          )}
          {tab === "Inspiration" && (
            <InspirationView
              event={event}
              savedOnly={savedOnly}
              setSavedOnly={setSavedOnly}
              saveIdea={saveIdea}
              openIdea={setIdea}
              ask={ask}
            />
          )}
          <footer className="main-footer">
            <span>
              <Flower2 size={14} />A little together goes a long way.
            </span>
            <button
              onClick={() => {
                downloadFile(
                  exportPlan(event),
                  `${event.name.replace(/[^a-z0-9]/gi, "-")}-plan.txt`,
                );
                notify("Your complete event plan is downloaded.");
              }}
            >
              <Download size={14} />
              Export your plan
            </button>
            <span>Made for moments that matter ♡</span>
          </footer>
        </main>
      </div>
      {!assistantOpen && (
        <button className="assistant-fab" onClick={() => ask()}>
          <Sparkles size={19} />
          <span>Ask Gather</span>
          <span className="fab-dot" />
        </button>
      )}
      {assistantOpen && (
        <Assistant
          key={`${event.id}-${assistantPrompt}`}
          event={event}
          prompt={assistantPrompt}
          liveAI={liveAI}
          close={() => setAssistantOpen(false)}
          addTask={(task) => {
            update((e) => ({ ...e, tasks: [...e.tasks, task] }));
            notify("Added to your timeline.");
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {(modal === "event" || modal === "edit-event") && (
        <EventForm
          event={modal === "edit-event" ? event : undefined}
          liveAI={liveAI}
          close={closeModal}
          save={createOrUpdate}
        />
      )}
      {(modal === "task" ||
        modal === "expense" ||
        modal === "vendor" ||
        modal === "guest") && (
        <ItemForm
          kind={modal}
          item={editing}
          event={event}
          close={closeModal}
          save={itemSave}
          remove={removeItem}
        />
      )}
      {modal === "settings" && (
        <SettingsForm
          profile={store.profile}
          liveAI={liveAI}
          close={closeModal}
          save={(profile) => {
            setStore({ ...store, profile });
            closeModal();
            notify("Your workspace is updated.");
          }}
          backup={() =>
            downloadFile(
              JSON.stringify(store, null, 2),
              "gather-backup.json",
              "application/json",
            )
          }
        />
      )}
      {modal === "help" && (
        <Modal
          title="A helping hand."
          subtitle="A few little things to help you find your feet."
          close={closeModal}
        >
          <div className="help-content">
            <h3>1. Make it yours</h3>
            <p>
              Create a wedding, birthday, or community event. Add your date,
              budget, guest count and the things you love.
            </p>
            <h3>2. Bring it together</h3>
            <p>
              Check off timeline tasks, record expenses, track vendor quotes and
              manage RSVPs. Every change is saved in this browser.
            </p>
            <h3>3. Find your spark</h3>
            <p>
              Save ideas or ask Gather for budget tips, styling ideas and vendor
              questions.{" "}
              {liveAI
                ? "Your assistant is connected to Gemini."
                : "Built-in mode is available now. Connect a server-side Gemini key for live AI."}
            </p>
            <div className="note">
              <Leaf size={19} />
              <p>
                Your plans stay on this device. Use Export your plan or Settings
                → Download backup to keep an extra copy. AI receives event
                details only when you ask for help; guest contacts are never
                included.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {modal === "notifications" && (
        <Modal
          title="A little heads-up."
          subtitle="Your next steps, in the order they need a little love."
          close={closeModal}
        >
          <div className="reminder-list">
            {upcoming.slice(0, 6).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  go("Timeline");
                  closeModal();
                }}
              >
                <span className="reminder-icon">
                  <CalendarDays size={18} />
                </span>
                <span>
                  <strong>{t.title}</strong>
                  <small>{dateLabel(t.date)}</small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
            {upcoming.length === 0 && (
              <p>You’re all caught up. Take a little moment for yourself.</p>
            )}
          </div>
        </Modal>
      )}
      {idea && (
        <Modal title={idea.title} subtitle={idea.tag} close={closeIdea}>
          <img
            className="idea-detail-image"
            src={idea.image}
            alt={idea.title}
          />
          <p className="idea-detail-text">{idea.description}</p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => {
                closeIdea();
                ask(
                  `Help me bring this idea to life: ${idea.title}. ${idea.description}`,
                );
              }}
            >
              <Sparkles size={16} />
              Make it personal
            </button>
            <button
              className="button primary"
              onClick={() => {
                saveIdea(idea.id);
                setIdea({
                  ...idea,
                  saved: !event.ideas.find((i) => i.id === idea.id)?.saved,
                });
              }}
            >
              <Bookmark
                size={16}
                fill={
                  event.ideas.find((i) => i.id === idea.id)?.saved
                    ? "currentColor"
                    : "none"
                }
              />
              {event.ideas.find((i) => i.id === idea.id)?.saved
                ? "Saved to your ideas"
                : "Save this idea"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
