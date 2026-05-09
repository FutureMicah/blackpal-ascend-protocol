/**
 * CurrencyConverter — refresh, cache clearing, and error/retry behavior.
 *
 * We mock the Supabase client so we can drive the academy_settings response.
 * btax.ts exposes clearBtaxRateCache so each test starts clean.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mutable handler for the chained .from(...).select(...).limit(...).maybeSingle()
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

describe("CurrencyConverter", () => {
  beforeEach(() => {
    clearBtaxRateCache();
    maybeSingleImpl = () =>
      Promise.resolve({ data: { btax_to_naira_rate: 100 }, error: null });
  });

  it("loads the live rate from academy_settings on mount", async () => {
    render(<CurrencyConverter />);
    await waitFor(() => {
      expect(screen.getAllByText(/1 BTAX = ₦100/i).length).toBeGreaterThan(0);
    });
  });

  it("renders the Naira context helper note", async () => {
    render(<CurrencyConverter />);
    await waitFor(() => {
      const note = screen.getByTestId("naira-context-note");
      expect(note.textContent).toMatch(/Naira/i);
      expect(note.textContent).toMatch(/BTAX/i);
      expect(note.textContent).toMatch(/activation fee/i);
    });
  });

  it("Refresh rate button clears cache and refetches a new rate", async () => {
    render(<CurrencyConverter />);
    await waitFor(() => screen.getAllByText(/1 BTAX = ₦100/i));

    // Change the next response — if cache cleared, we should see ₦150.
    maybeSingleImpl = () =>
      Promise.resolve({ data: { btax_to_naira_rate: 150 }, error: null });

    const refreshBtn = screen.getByLabelText(/refresh rate/i);
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/1 BTAX = ₦150/i).length).toBeGreaterThan(0);
    });
  });

  it("shows a friendly error banner with Retry when academy_settings fails", async () => {
    maybeSingleImpl = () =>
      Promise.resolve({ data: null, error: { message: "boom" } });

    render(<CurrencyConverter />);
    await waitFor(() => {
      expect(
        screen.getByText(/couldn't load live rate/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    // Recover on retry
    maybeSingleImpl = () =>
      Promise.resolve({ data: { btax_to_naira_rate: 200 }, error: null });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.queryByText(/couldn't load live rate/i)).not.toBeInTheDocument();
      expect(screen.getAllByText(/1 BTAX = ₦200/i).length).toBeGreaterThan(0);
    });
  });

  it("falls back to default ₦100/BTAX when the rate fails", async () => {
    maybeSingleImpl = () =>
      Promise.resolve({ data: null, error: { message: "down" } });

    render(<CurrencyConverter />);

    // Type 100 Naira → expect 1 BTAX with default rate
    const input = screen.getByPlaceholderText("0") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "100" } });

    await waitFor(() => {
      expect(screen.getByText(/1 BTAX$/i)).toBeInTheDocument();
    });
  });
});
