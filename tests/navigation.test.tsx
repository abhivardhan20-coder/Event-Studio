// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceNavigation } from "../components/workspace/navigation";
import { useWorkspaceController } from "../hooks/use-workspace-controller";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mockBrowserStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  });
}

function NavigationHarness() {
  const workspace = useWorkspaceController();
  const { store, event, headingRef, tab } = workspace;
  if (!store || !event) return <p>Loading workspace</p>;
  return (
    <div>
      <button
        onClick={() => workspace.setSidebarOpen(true)}
        aria-expanded={workspace.sidebarOpen}
      >
        Open planning menu
      </button>
      <WorkspaceNavigation workspace={{ ...workspace, store, event }} />
      <main>
        <h1 ref={headingRef} tabIndex={-1}>
          {tab}
        </h1>
        <button>Planning content action</button>
      </main>
    </div>
  );
}

it("contains mobile-menu focus, restores its trigger, and focuses the destination after navigation", async () => {
  mockBrowserStorage();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === "(max-width: 900px)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        Response.json({
          configured: false,
          provider: "gemini",
          requiresSignIn: false,
        }),
      ),
    ),
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );
  const user = userEvent.setup();
  render(<NavigationHarness />);
  const trigger = await screen.findByRole("button", {
    name: "Open planning menu",
  });
  await user.click(trigger);
  const menu = screen.getByRole("dialog", { name: "Planning menu" });
  expect(menu.getAttribute("aria-modal")).toBe("true");
  const close = screen.getByRole("button", { name: "Close planning menu" });
  expect(document.activeElement).toBe(close);
  const firstStop = menu.querySelector<HTMLElement>("button,a[href]")!;
  firstStop.focus();
  await user.tab({ shift: true });
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Settings" }),
  );
  await user.tab();
  expect(document.activeElement).toBe(firstStop);
  screen.getByRole("button", { name: "Planning content action" }).focus();
  expect(document.activeElement).toBe(firstStop);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog", { name: "Planning menu" })).toBeNull();
  expect(document.activeElement).toBe(trigger);
  await user.click(trigger);
  await user.click(screen.getByRole("button", { name: "Budget" }));
  const heading = await screen.findByRole("heading", { name: "Budget" });
  await waitFor(() => expect(document.activeElement).toBe(heading));
  expect(screen.queryByRole("dialog", { name: "Planning menu" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Budget" }).getAttribute("aria-current"),
  ).toBe("page");
  expect(document.body.style.overflow).not.toBe("hidden");
  await user.click(trigger);
  await user.click(screen.getByRole("button", { name: "Close planning menu" }));
  expect(document.activeElement).toBe(trigger);
});

it("keeps desktop navigation outside modal isolation", async () => {
  mockBrowserStorage();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        Response.json({
          configured: false,
          provider: "gemini",
          requiresSignIn: false,
        }),
      ),
    ),
  );
  const user = userEvent.setup();
  render(<NavigationHarness />);
  await user.click(
    await screen.findByRole("button", { name: "Open planning menu" }),
  );
  expect(screen.queryByRole("dialog", { name: "Planning menu" })).toBeNull();
  expect(
    screen.getByRole("complementary", { name: "Planning navigation" }),
  ).toBeDefined();
  expect(document.body.style.overflow).not.toBe("hidden");
  const content = screen.getByRole("button", {
    name: "Planning content action",
  });
  content.focus();
  expect(document.activeElement).toBe(content);
});
