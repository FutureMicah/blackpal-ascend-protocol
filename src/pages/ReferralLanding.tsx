import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function ReferralLanding() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      try {
        localStorage.setItem("referral_code", code.toUpperCase());
      } catch {}
    }
    navigate("/", { replace: true });
  }, [code, navigate]);

  return null;
}
