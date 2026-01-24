import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { verifyEmail } from "../api/auth";
import lbRevizeLogo from "../pngs/lb-revize.png";

type Status = "idle" | "loading" | "success" | "error";

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Chybi overovaci token.");
      return;
    }

    let active = true;
    setStatus("loading");
    verifyEmail(token)
      .then(() => {
        if (!active) return;
        setStatus("success");
        setMessage("Ucet byl overen. Presmerovani na login...");
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      })
      .catch((err: any) => {
        if (!active) return;
        setStatus("error");
        setMessage(err?.message || "Overeni se nezdarilo.");
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
          <h2 className="card-title justify-center mb-4 text-2xl font-semibold">Overeni uctu</h2>
          {status === "loading" && <p className="text-sm text-slate-600">Overuji...</p>}
          {status !== "loading" && <p className="text-sm text-slate-700">{message}</p>}
          {status === "error" && (
            <div className="mt-4">
              <Link to="/login" className="link link-secondary">
                Zpet na prihlaseni
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
