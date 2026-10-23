"use client";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  saveItem,
  removeItem as removePlannerItem,
  dateLabel,
  daysUntil,
  exportPlan,
  type Celebration,
  type ItemKind,
  type Tab,
  type Idea,
  type Task,
  type Expense,
  type Vendor,
  type Guest,
} from "@/lib/planner";
import { Overview } from "./views/overview";
import { EventForm, ItemForm, SettingsForm } from "./forms";
import { Assistant } from "./assistant";
import { Modal, downloadFile } from "./ui";
import Image from "next/image";
import { usePlannerStore } from "@/hooks/use-planner-store";
import { useAIStatus } from "@/hooks/use-ai-status";

const BudgetView = lazy(() =>
  import("./views/budget").then((module) => ({ default: module.BudgetView })),
);
const TimelineView = lazy(() =>
  import("./views/timeline").then((module) => ({
    default: module.TimelineView,
  })),
);
const VendorsView = lazy(() =>
  import("./views/vendors").then((module) => ({ default: module.VendorsView })),
);
const GuestsView = lazy(() =>
  import("./views/guests").then((module) => ({ default: module.GuestsView })),
);
const InspirationView = lazy(() =>
  import("./views/inspiration").then((module) => ({
    default: module.InspirationView,
  })),
);

const navigation: { name: Tab; icon: typeof LayoutGrid }[] = [
  { name: "Overview", icon: LayoutGrid },
  { name: "Budget", icon: Wallet },
  { name: "Timeline", icon: CalendarDays },
  { name: "Vendors", icon: Store },
  { name: "Guest list", icon: Users },
];
type ModalKind =
  | "event"
  | "edit-event"
  | "settings"
  | "help"
  | "notifications"
  | ItemKind
  | null;

export default function PlannerApp() {
  const { store, setStore, persisted, warning, restoreBackup, recoveryBackup } =
    usePlannerStore();
  const { configured: liveAI, requiresSignIn } = useAIStatus();
  const headingRef = useRef<HTMLHeadingElement>(null);
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
  const notify = useCallback((message: string) => setToast(message), []);
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
  const closeAssistant = useCallback(() => setAssistantOpen(false), []);
  useEffect(() => {
    if (!sidebarOpen) return;
    document.querySelector<HTMLButtonElement>(".sidebar nav button")?.focus();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        document.querySelector<HTMLButtonElement>(".mobile-menu")?.focus();
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [sidebarOpen]);
  const event =
    store?.events.find((e) => e.id === store.activeId) ?? store?.events[0];
  const update = useCallback(
    (updater: (event: Celebration) => Celebration) =>
      setStore((current) => ({
        ...current,
        events: current.events.map((event) =>
          event.id === current.activeId ? updater(event) : event,
        ),
      })),
    [setStore],
  );
  const openItem = (kind: ItemKind, item?: Task | Expense | Vendor | Guest) => {
    setEditing(item);
    setModal(kind);
  };
  const go = (next: Tab) => {
    setTab(next);
    setSavedOnly(false);
    setSidebarOpen(false);
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const ask = (prompt = "") => {
    setModal(null);
    setIdea(null);
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
    const committed = setStore((current) => ({
      ...current,
      activeId: next.id,
      events:
        modal === "edit-event"
          ? current.events.map((e) => (e.id === next.id ? next : e))
          : [...current.events, next],
    }));
    if (!committed) return;
    setTab("Overview");
    closeModal();
    notify(
      modal === "edit-event"
        ? "Your event details are updated."
        : `Your ${next.type.toLowerCase()} plan is ready. Let's make it special.`,
    );
  };
  const itemSave = (kind: ItemKind, value: Task | Expense | Vendor | Guest) => {
    if (!update((e) => saveItem(e, kind, value))) return;
    closeModal();
    notify(
      `${kind[0].toUpperCase() + kind.slice(1)} ${editing ? "updated" : "added"}. One less thing to think about.`,
    );
  };
  const removeItem = (kind: ItemKind, id: string) => {
    if (!update((e) => removePlannerItem(e, kind, id))) return;
    closeModal();
    notify("Removed from your plan.");
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to planning content
      </a>
      {sidebarOpen && (
        <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        id="planning-navigation"
        className={`sidebar ${sidebarOpen ? "is-open" : ""}`}
      >
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
        <span className="nav-label">LET’S MAKE IT HAPPEN</span>
        <nav aria-label="Planning tools">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-current={tab === name ? "page" : undefined}
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
              aria-label="Profile settings"
            >
              {store.profile.slice(0, 2).toUpperCase()}
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {warning && (
            <div className="storage-warning" role="alert">
              {warning}{" "}
              <button
                className="text-button"
                onClick={() => setModal("settings")}
              >
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
          <Suspense
            fallback={
              <div className="panel view-loading" role="status">
                Opening your planning tools…
              </div>
            }
          >
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
          </Suspense>
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
          requiresSignIn={requiresSignIn}
          close={closeAssistant}
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
          requiresSignIn={requiresSignIn}
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
          close={closeModal}
          save={itemSave}
          remove={removeItem}
        />
      )}
      {modal === "settings" && (
        <SettingsForm
          restore={restoreBackup}
          recovery={() => {
            try {
              const raw = recoveryBackup();
              if (raw)
                downloadFile(raw, "gather-recovery.json", "application/json");
            } catch {
              notify(
                "Browser recovery is unavailable. Download your current backup instead.",
              );
            }
          }}
          profile={store.profile}
          liveAI={liveAI}
          requiresSignIn={requiresSignIn}
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
          <Image
            width={1200}
            height={800}
            unoptimized
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
