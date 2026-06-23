import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveSessionRoom } from "./LiveSessionRoom";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: new Error("no key") }) },
    from: () => ({ select: () => ({ eq: () => ({ is: () => ({ order: () => ({ limit: () => ({ then: () => {} }) }) }) }) }) }),
    channel: () => ({ on: () => ({ on: () => ({ on: () => ({ subscribe: () => ({}) }) }) }) }),
    removeChannel: vi.fn(),
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  },
}));

vi.mock("@/components/classes/ClassChatRoom", () => ({
  ClassChatRoom: () => <div data-testid="class-chat">chat</div>,
}));

const baseSession = {
  id: "s1",
  title: "Demo session",
  course_id: "c1",
  provider: "jitsi" as const,
  room_name: "room-1",
};

const setViewport = (w: number, h: number) => {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: w });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: h });
  window.dispatchEvent(new Event("resize"));
};

describe("LiveSessionRoom responsive layout", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (q: string) => ({
        matches: window.innerWidth < 768,
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
        onchange: null,
      }),
    });
  });

  it("renders touch-sized mic and chat toggles with aria labels", () => {
    setViewport(390, 844); // mobile portrait
    render(
      <LiveSessionRoom
        open
        onClose={() => {}}
        session={baseSession}
        userId="u1"
        userName="Tester"
      />,
    );
    const mic = screen.getByLabelText(/microphone/i);
    expect(mic).toBeInTheDocument();
    expect(mic.className).toMatch(/min-h-11/);
    const chat = screen.getByLabelText(/chat/i);
    expect(chat.className).toMatch(/min-h-11/);
  });

  it("renders session title in header", () => {
    setViewport(1280, 800);
    render(
      <LiveSessionRoom
        open
        onClose={() => {}}
        session={baseSession}
        userId="u1"
        userName="Tester"
      />,
    );
    expect(screen.getByText("Demo session")).toBeInTheDocument();
  });
});
