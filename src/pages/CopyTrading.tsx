// CopyTrading removed — not part of the academy product. This stub keeps the
// import path resolvable in case any deep-link still references it; the route
// itself was removed from src/App.tsx.
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function CopyTrading() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/dashboard", { replace: true }); }, [navigate]);
  return null;
}
