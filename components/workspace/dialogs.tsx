"use client";
import { dateLabel } from "@/lib/planner";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Leaf,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { Assistant } from "../assistant";
import { EventForm, ItemForm, SettingsForm } from "../forms";
import { downloadFile, Modal } from "../ui";

import type { ReadyWorkspace } from "@/hooks/use-workspace-controller";

export function WorkspaceDialogs({ workspace }: { workspace: ReadyWorkspace }) {
  const {
    dialog,
    event,
    store,
    liveAI,
    requiresSignIn,
    closeModal,
    createOrUpdate,
    itemSave,
    removeItem,
    restoreBackup,
    recoveryBackup,
    notify,
    saveProfile,
    upcoming,
    go,
    idea,
    saveIdea,
    ask,
    addTask,
  } = workspace;
  const modal = dialog?.type;
  const closeIdea = closeModal;
  return (
    <>
      {dialog?.type === "assistant" && (
        <Assistant
          key={`${event.id}-${dialog.prompt}`}
          event={event}
          prompt={dialog.prompt}
          liveAI={liveAI}
          requiresSignIn={requiresSignIn}
          close={closeModal}
          addTask={addTask}
        />
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
      {dialog?.type === "item" && (
        <ItemForm
          {...dialog}
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
          save={saveProfile}
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
    </>
  );
}
