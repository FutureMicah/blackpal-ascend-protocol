/**
 * Ambient luxury layer — film grain, breathing vignette and drifting light
 * streaks. Pure CSS (transform/opacity only), zero JS per frame.
 */
export function AscendAmbient({ streaks = true }: { streaks?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="ascend-grain absolute inset-0" />
      <div className="ascend-vignette absolute inset-0" />
      {streaks && (
        <>
          <span className="ascend-streak" style={{ top: "18%", animationDelay: "0s" }} />
          <span className="ascend-streak ascend-streak--violet" style={{ top: "64%", animationDelay: "9s" }} />
        </>
      )}
    </div>
  );
}
