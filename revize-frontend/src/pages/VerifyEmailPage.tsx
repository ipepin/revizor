import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { verifyEmail } from "../api/auth";
import lbRevizeLogo from "../pngs/lb-revize.png";

type Status = "idle" | "loading" | "success" | "error";

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/login?verified=0", { replace: true });
      return;
    }

    let active = true;
    setStatus("loading");
    verifyEmail(token)
      .then(() => {
        if (!active) return;
        navigate("/login?verified=1", { replace: true });
      })
      .catch(() => {
        if (!active) return;
        navigate("/login?verified=0", { replace: true });
      });

    return () => {
      active = false;
    };
  }, [navigate, params]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary to-secondary text-base-content px-4">
      <div className="flex items-center justify-center mb-4 select-none">
        <img src={lbRevizeLogo} alt="LB-Revize" className="w-full max-w-xs sm:max-w-sm" />
      </div>

      <div className="card w-full max-w-md backdrop-blur-md bg-base-100/70 shadow-2xl border border-base-200">
        <div className="card-body p-8 sm:p-10 text-center">
          <h2 className="card-title justify-center mb-4 text-2xl font-semibold">Ověření účtu</h2>
          {status === "loading" && <p className="text-sm text-slate-600">Ověřuji účet…</p>}
          {status !== "loading" && (
            <p className="text-sm text-slate-700">Přesměrovávám na přihlášení…</p>
          )}
          <div className="mt-4">
            <Link to="/login" className="link link-secondary">
              Zpět na přihlášení
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
