import { useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import lbRevizeLogo from "../pngs/lb-revize.png";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [params] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const statusMessage = useMemo(() => {
    const verified = params.get("verified");
    const registered = params.get("registered");
    if (verified === "1") {
      return { tone: "success", text: "Účet byl úspěšně ověřen. Můžete se přihlásit." };
    }
    if (verified === "0") {
      return { tone: "error", text: "Ověření účtu se nezdařilo. Požádejte o nový ověřovací e-mail." };
    }
    if (registered === "1") {
      return { tone: "info", text: "Ověřovací e-mail byl odeslán. Po ověření účtu se přihlaste." };
    }
    return null;
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary to-secondary text-base-content px-4">
      <div className="flex items-center justify-center mb-0 select-none">
        <img
          src={lbRevizeLogo}
          alt="LB-Revize"
          className="w-full max-w-xs sm:max-w-sm"
        />
      </div>

      <div className="card w-full max-w-md backdrop-blur-md bg-base-100/70 shadow-2xl border border-base-200">
        <div className="card-body p-8 sm:p-10">
          <h2 className="card-title justify-center mb-6 text-2xl font-semibold">Přihlášení</h2>

          {statusMessage && (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                statusMessage.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : statusMessage.tone === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <input
              required
              type="email"
              placeholder="E-mail"
              className="input input-bordered w-full input-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              required
              type="password"
              placeholder="Heslo"
              className="input input-bordered w-full input-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="text-error text-sm -mt-2">{error}</p>}

            <button type="submit" className="btn btn-accent w-full" disabled={loading}>
              {loading ? "Přihlašuji…" : "Přihlásit se"}
            </button>
          </form>

          <p className="mt-6 text-sm text-center">
            Nemáte účet? <Link to="/register" className="link link-secondary">Registrace</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
