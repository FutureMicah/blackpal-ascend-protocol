// E2E behavior test: announcement popup appears for logged-in user, can be
// dismissed, dismissal is persisted, and the popup never reappears for that
// announcement on subsequent loads.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

// Track inserted dismissals
const dismissedIds = new Set<string>();
const announcement = {
  id: "ann-1",
  title: "Scheduled maintenance tonight",
  body: "We'll be down 10pm–11pm WAT.",
  level: "info",
  link_url: null,
  link_label: null,
  created_at: new Date().toISOString(),
};

vi.mock("@/integrations/supabase/client", () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
  };
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from: (table: string) => ({
        select: () => ({
          order: () => ({
            limit: async () =>
              table === "app_announcements"
                ? { data: [announcement], error: null }
                : { data: [], error: null },
          }),
          eq: async () =>
            table === "app_announcement_dismissals"
              ? { data: [...dismissedIds].map((id) => ({ announcement_id: id })), error: null }
              : { data: [], error: null },
        }),
        insert: async (row: any) => {
          if (table === "app_announcement_dismissals") {
            dismissedIds.add(row.announcement_id);
          }
          return { error: null };
        },
      }),
      channel: () => channel,
      removeChannel: () => {},
    },
  };
});

import { AnnouncementPopup } from "./AnnouncementPopup";

describe("AnnouncementPopup E2E", () => {
  beforeEach(() => {
    dismissedIds.clear();
    cleanup();
  });

  it("shows the latest active announcement to a signed-in user", async () => {
    render(<AnnouncementPopup />);
    await waitFor(() => {
      expect(screen.getByText("Scheduled maintenance tonight")).toBeInTheDocument();
    });
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-live", "polite");
  });

  it("dismisses the popup when Dismiss is clicked and persists the choice", async () => {
    render(<AnnouncementPopup />);
    const dismissBtn = await screen.findByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissBtn);
    await waitFor(() => {
      expect(screen.queryByText("Scheduled maintenance tonight")).not.toBeInTheDocument();
    });
    expect(dismissedIds.has("ann-1")).toBe(true);
  });

  it("does not reappear after dismissal on next mount", async () => {
    dismissedIds.add("ann-1");
    render(<AnnouncementPopup />);
    // Give the async load a tick
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByText("Scheduled maintenance tonight")).not.toBeInTheDocument();
  });
});
