"use client";
import { type Tab } from "@/lib/planner";
import {
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Flower2,
  LayoutGrid,
  Leaf,
  Settings,
  Sparkles,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useRef } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import type { ReadyWorkspace } from "@/hooks/use-workspace-controller";
import { useDialog } from "../ui";
const navigation: { name: Tab; icon: typeof LayoutGrid }[] = [
  { name: "Overview", icon: LayoutGrid },
  { name: "Budget", icon: Wallet },
  { name: "Timeline", icon: CalendarDays },
  { name: "Vendors", icon: Store },
  { name: "Guest list", icon: Users },
];

export function WorkspaceNavigation({
  workspace,
}: {
  workspace: ReadyWorkspace;
}) {
  const {
    store,
    event,
    sidebarOpen,
    closeSidebar,
    tab,
    savedOnly,
    go,
    ask,
    setModal,
    setSavedOnly,
    saved,
  } = workspace;
  const isMobile = useMediaQuery("(max-width: 900px)");
  const navigationRef = useRef<HTMLDivElement>(null),
    closeRef = useRef<HTMLButtonElement>(null);
  useDialog(navigationRef, closeSidebar, {
    enabled: isMobile && sidebarOpen,
    initialFocus: closeRef,
  });
  return (
    <div
      ref={navigationRef}
      role={isMobile && sidebarOpen ? "dialog" : undefined}
      aria-modal={isMobile && sidebarOpen ? true : undefined}
      aria-label={isMobile && sidebarOpen ? "Planning menu" : undefined}
    >
      {sidebarOpen && (
        <div
          className="sidebar-scrim"
          aria-hidden="true"
          onClick={closeSidebar}
        />
      )}
      <section
        role={isMobile ? undefined : "complementary"}
        aria-label="Planning navigation"
        id="planning-navigation"
        className={`sidebar ${sidebarOpen ? "is-open" : ""}`}
      >
        <div className="sidebar-brand-row">
          <button
            ref={closeRef}
            className="icon-button mobile-menu-close"
            aria-label="Close planning menu"
            onClick={closeSidebar}
          >
            <X size={20} />
          </button>
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
        </div>
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
          aria-current={
            tab === "Inspiration" && !savedOnly ? "page" : undefined
          }
          className={`nav-item ${tab === "Inspiration" && !savedOnly ? "active" : ""}`}
          onClick={() => go("Inspiration")}
        >
          <Leaf size={19} strokeWidth={1.65} />
          <span>Ideas & inspiration</span>
        </button>
        <button
          aria-current={tab === "Inspiration" && savedOnly ? "page" : undefined}
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
      </section>
    </div>
  );
}
