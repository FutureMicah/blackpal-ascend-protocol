import { useEffect, useState } from "react";

export type Orientation = "portrait" | "landscape";

/** Reports current viewport orientation and updates on resize/rotation. */
export function useOrientation(): Orientation {
  const get = (): Orientation =>
    typeof window === "undefined" || window.innerWidth >= window.innerHeight
      ? "landscape"
      : "portrait";

  const [orientation, setOrientation] = useState<Orientation>(get);

  useEffect(() => {
    const onChange = () => setOrientation(get());
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);

  return orientation;
}
