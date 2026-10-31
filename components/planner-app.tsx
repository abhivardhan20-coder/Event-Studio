"use client";
import { exportPlan } from "@/lib/planner";
import { Check, Download, Flower2, Sparkles, X } from "lucide-react";
import { lazy, Suspense } from "react";
import { downloadFile } from "./ui";
import { Overview } from "./views/overview";

import {
  useWorkspaceController,
  workspaceReady,
} from "@/hooks/use-workspace-controller";
import { WorkspaceDialogs } from "./workspace/dialogs";
import { WorkspaceIntro, WorkspaceTopbar } from "./workspace/header";
import { WorkspaceNavigation } from "./workspace/navigation";
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

export default function PlannerApp() {
  const workspace = useWorkspaceController();
  if (!workspaceReady(workspace)) {
    return (
      <div className="app-loading">
        <Flower2 size={46} />
        <span>
          gather<span className="brand-dot">.</span>
        </span>
        <p>Making room for your next beautiful moment…</p>
      </div>
    );
  }
  const {
    event,
    tab,
    go,
    toggleTask,
    openItem,
    saveIdea,
    setIdea,
    ask,
    update,
    notify,
    savedOnly,
    setSavedOnly,
    dialog,
    toast,
    setToast,
  } = workspace;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to planning content
      </a>
      <WorkspaceNavigation workspace={workspace} />
      <div className="main-shell">
        <WorkspaceTopbar workspace={workspace} />
        <main id="main-content" className="main-content" tabIndex={-1}>
          <WorkspaceIntro workspace={workspace} />
          <Suspense
            key={event.id}
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
      {dialog?.type !== "assistant" && (
        <button className="assistant-fab" onClick={() => ask()}>
          <Sparkles size={19} />
          <span>Ask Gather</span>
          <span className="fab-dot" />
        </button>
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
      <WorkspaceDialogs workspace={workspace} />
    </div>
  );
}
