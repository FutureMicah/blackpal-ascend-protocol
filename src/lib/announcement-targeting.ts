// Pure visibility predicate that mirrors the RLS rule for app_announcements:
// an announcement is visible to a user when (a) the current time is inside its
// [starts_at, ends_at) window (or that bound is null) and (b) target_roles is
// empty/null OR the viewer holds at least one of those roles.
//
// Keeping this as a tiny pure function lets both the admin preview UI and the
// E2E tests assert that the simulated targeting matches what real publish would
// expose, without duplicating logic.
export interface AnnouncementTarget {
  starts_at?: string | Date | null;
  ends_at?: string | Date | null;
  target_roles?: string[] | null;
}

export function isAnnouncementVisible(
  ann: AnnouncementTarget,
  now: Date = new Date(),
  viewerRoles: string[] = [],
): boolean {
  const s = ann.starts_at ? new Date(ann.starts_at) : null;
  const e = ann.ends_at ? new Date(ann.ends_at) : null;
  const inWindow = (!s || s <= now) && (!e || e > now);
  if (!inWindow) return false;
  const targets = ann.target_roles ?? [];
  if (targets.length === 0) return true;
  return viewerRoles.some((r) => targets.includes(r));
}

export function describeAnnouncementWindow(ann: AnnouncementTarget, now: Date = new Date()): string {
  const s = ann.starts_at ? new Date(ann.starts_at) : null;
  const e = ann.ends_at ? new Date(ann.ends_at) : null;
  const visible = (!s || s <= now) && (!e || e > now);
  return `${s ? s.toLocaleString() : "now"} → ${e ? e.toLocaleString() : "indefinite"} · ${
    visible ? "VISIBLE NOW" : "scheduled / expired"
  }`;
}
