import { describe, it, expect, vi } from "vitest";
import { loadAtlasTraders } from "./atlas-data";

function mockSupabase(result: { data: any; error: any }) {
  return { rpc: vi.fn(async () => result) };
}

describe("loadAtlasTraders", () => {
  it("calls atlas_public_users with safe defaults and returns rows untouched", async () => {
    const rows = [
      {
        user_id: "u1",
        display_name: "Trader",
        avatar_url: null,
        country: "Nigeria",
        country_code: "NG",
        latitude: 6.5,
        longitude: 3.3,
        is_online: true,
        is_trading: false,
        last_seen_at: "2026-11-24T00:00:00Z",
        precision_level: "country",
      },
    ];
    const client = mockSupabase({ data: rows, error: null });
    const out = await loadAtlasTraders(client as any);
    expect(client.rpc).toHaveBeenCalledWith("atlas_public_users", {
      p_only_online: false,
      p_only_trading: false,
      p_limit: 800,
    });
    expect(out).toEqual(rows);
  });

  it("forwards filters", async () => {
    const client = mockSupabase({ data: [], error: null });
    await loadAtlasTraders(client as any, { onlyOnline: true, onlyTrading: true, limit: 50 });
    expect(client.rpc).toHaveBeenCalledWith("atlas_public_users", {
      p_only_online: true,
      p_only_trading: true,
      p_limit: 50,
    });
  });

  it("returns [] on rpc error and never leaks partial data", async () => {
    const client = mockSupabase({ data: [{ user_id: "u1" }], error: new Error("denied") });
    expect(await loadAtlasTraders(client as any)).toEqual([]);
  });

  it("returns [] when rpc returns no rows", async () => {
    expect(await loadAtlasTraders(mockSupabase({ data: null, error: null }) as any)).toEqual([]);
  });
});
