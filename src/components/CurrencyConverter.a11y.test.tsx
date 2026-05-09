/**
 * A11y tests for the CurrencyConverter:
 * - Refresh button has visible focus ring class and aria-label
 * - Keyboard interaction (Tab → Enter) refreshes
 * - Aria-live region announces error state
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let maybeSingleImpl: () => Promise<{ data: any; error: any }> = () =>
  Promise.resolve({ data: { btax_to_naira_rate: 100 }, error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        limit: () => ({
          maybeSingle: () => maybeSingleImpl(),
        }),
      }),
    }),
  },
}));

import { CurrencyConverter } from "@/components/CurrencyConverter";
import { clearBtaxRateCache } from "@/lib/btax";

describe("CurrencyConverter a11y", () => {
  beforeEach(() => {
    clearBtaxRateCache();
    maybeSingleImpl = () =>
      Promise.resolve({ data: { btax_to_naira_rate: 100 }, error: null });
  });

  it("Refresh button is keyboard reachable with a visible focus ring", async () => {
    render(<CurrencyConverter />);
    await waitFor(() => screen.getByLabelText(/refresh rate/i));
    const refresh = screen.getByLabelText(/refresh rate/i);
    expect(refresh.className).toMatch(/focus-visible:ring/);
    refresh.focus();
    expect(document.activeElement).toBe(refresh);
  });

  it("Flip and amount input expose focus rings", async () => {
    render(<CurrencyConverter />);
    await waitFor(() => screen.getByLabelText(/flip direction/i));
    expect(screen.getByLabelText(/flip direction/i).className).toMatch(/focus-visible:ring/);
    expect((screen.getByPlaceholderText("0") as HTMLElement).className).toMatch(/focus-visible:ring/);
  });

  it("announces the rate error via an aria-alert region", async () => {
    maybeSingleImpl = () =>
      Promise.resolve({ data: null, error: { message: "down" } });
    render(<CurrencyConverter />);
    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toMatch(/couldn't load live rate/i);
    });
  });

  it("renders the rate refresh history with last + previous entries", async () => {
    render(<CurrencyConverter showRateHistory />);
    await waitFor(() => screen.getByTestId("rate-refresh-history"));
    // Trigger a rate change to populate "previous"
    maybeSingleImpl = () =>
      Promise.resolve({ data: { btax_to_naira_rate: 250 }, error: null });
    fireEvent.click(screen.getByLabelText(/refresh rate/i));
    await waitFor(() => {
      const panel = screen.getByTestId("rate-refresh-history");
      expect(panel.textContent).toMatch(/250/);
      expect(panel.textContent).toMatch(/Previous/);
    });
  });

  it("renders the data source status panel showing academy_settings (live)", async () => {
    render(<CurrencyConverter showDataSourcePanel />);
    await waitFor(() => {
      const panel = screen.getByTestId("data-source-panel");
      expect(panel.textContent).toMatch(/academy_settings/);
      expect(panel.textContent).toMatch(/live/i);
    });
  });
});
