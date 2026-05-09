/**
 * E2E: the Naira balance shown on the dashboard is read-only and comes
 * directly from `wallets.naira_balance` — which only admin RPCs can write.
 * No input/textarea/contenteditable should appear in the Naira block.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BtaxWalletOverview } from "./BtaxWalletOverview";

vi.mock("@/integrations/supabase/client", () => {
  const wallet = {
    id: "w1",
    btax_balance: 0,
    naira_balance: 75000,
    naira_funded_total: 0,
    btax_spent_total: 0,
    btax_earned_total: 0,
    status: "active",
  };
  const chain = (rows: any) => {
    const obj: any = {
      select: () => obj,
      eq: () => obj,
      order: () => obj,
      limit: () => obj,
      maybeSingle: () => Promise.resolve({ data: rows, error: null }),
      then: (fn: any) => Promise.resolve({ data: rows, error: null }).then(fn),
    };
    return obj;
  };
  return {
    supabase: {
      from: (t: string) => {
        if (t === "wallets") return chain(wallet);
        if (t === "wallet_transactions") return chain([]);
        return chain([]);
      },
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
      removeChannel: () => {},
    },
  };
});

describe("Naira dashboard (admin-controlled)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the Naira balance from the wallet row and labels it admin-controlled", async () => {
    render(<BtaxWalletOverview userId="u1" />);
    expect(await screen.findByText(/Naira balance/i)).toBeInTheDocument();
    expect(await screen.findByText(/Set by admin/i)).toBeInTheDocument();
    expect(await screen.findByText(/₦75,000/)).toBeInTheDocument();
  });

  it("contains no editable input/textarea/contenteditable for Naira", async () => {
    const { container } = render(<BtaxWalletOverview userId="u1" />);
    await screen.findByText(/Naira balance/i);
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector('[contenteditable="true"]')).toBeNull();
  });

  it("derives BTAX conversion deterministically (₦100 = 1 BTAX)", async () => {
    render(<BtaxWalletOverview userId="u1" />);
    // 75000 / 100 = 750
    expect(await screen.findByText(/750 BTAX/)).toBeInTheDocument();
  });

  it("links Convert to the BlackCoin convert flow (not a free-form input)", async () => {
    render(<BtaxWalletOverview userId="u1" />);
    const link = await screen.findByRole("link", { name: /Convert/ });
    expect(link.getAttribute("href")).toBe("/blackcoin?action=convert");
  });
});
