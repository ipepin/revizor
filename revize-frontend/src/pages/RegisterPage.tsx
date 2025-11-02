import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { RegisterPayload } from "../api/auth";
import { lookupRt, type RtLookupResponse } from "../api/auth";
import { UserPlus, CheckCircle, XCircle } from "lucide-react";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState<RegisterPayload>({
    name: "",
    email: "",
    password: "",
    phone: "",
    certificate_number: "",
    authorization_number: "",
    address: "",
    ico: "",
    dic: "",
  });
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyResult, setVerifyResult] = useState<RtLookupResponse | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== confirm) {
      setError("Hesla se neshodují");
      return;
    }
    try {
      setLoading(true);
      const res = await lookupRt({ name: form.name, certificate_number: form.certificate_number });
      setVerifyResult(res);
      setVerifyOpen(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const confirmRegister = async () => {
    try {
      setLoading(true);
      await register(form);
      navigate("/login", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setVerifyOpen(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary to-secondary text-base-content px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 select-none">
        <UserPlus className="w-9 h-9 text-accent" />
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Revizor <span className="text-accent-content">0.1</span>
          <span className="text-sm font-normal ml-2">by JB</span>
        </h1>
      </div>

      {/* Glass card */}
      <div className="card w-full max-w-md backdrop-blur-md bg-base-100/70 shadow-2xl border border-base-200">
        <div className="card-body p-8 sm:p-10">
          <h2 className="card-title justify-center mb-6 text-2xl font-semibold">Registrace</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <input
              required
              name="name"
              placeholder="Jméno a příjmení"
              className="input input-bordered w-full input-primary"
              value={form.name}
              onChange={handleChange}
            />

            <input
              required
              type="email"
              name="email"
              placeholder="E-mail"
              className="input input-bordered w-full input-primary"
              value={form.email}
              onChange={handleChange}
            />

            <input
              required
              name="phone"
              placeholder="Telefon"
              className="input input-bordered w-full input-primary"
              value={form.phone || ""}
              onChange={handleChange}
            />

            <input
              required
              name="certificate_number"
              placeholder="Číslo osvědčení RT (např. 1234/E2A)"
              className="input input-bordered w-full input-primary"
              value={form.certificate_number}
              onChange={handleChange}
            />

            <input
              name="authorization_number"
              placeholder="Číslo oprávnění (nepovinné)"
              className="input input-bordered w-full input-primary"
              value={form.authorization_number || ""}
              onChange={handleChange}
            />

            <input
              name="address"
              placeholder="Adresa"
              className="input input-bordered w-full input-primary"
              value={form.address || ""}
              onChange={handleChange}
            />

            <input
              name="ico"
              placeholder="IČO"
              className="input input-bordered w-full input-primary"
              value={form.ico || ""}
              onChange={handleChange}
            />

            <input
              name="dic"
              placeholder="DIČ"
              className="input input-bordered w-full input-primary"
              value={form.dic || ""}
              onChange={handleChange}
            />

            <input
              required
              type="password"
              name="password"
              placeholder="Heslo"
              className="input input-bordered w-full input-primary"
              value={form.password}
              onChange={handleChange}
            />

            <input
              required
              type="password"
              placeholder="Potvrdit heslo"
              className="input input-bordered w-full input-primary"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            {error && <p className="text-error text-sm -mt-2">{error}</p>}

            <button type="submit" className="btn btn-accent w-full" disabled={loading}>
              {loading ? "Ověřuji…" : "Ověřit a pokračovat"}
            </button>
          </form>

          <p className="mt-6 text-sm text-center">
            Už máte účet? <Link to="/login" className="link link-secondary">Přihlásit se</Link>
          </p>
        </div>
      </div>

      {/* TIČR ověřovací dialog */}
      {verifyOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 grid place-items-center"
          onClick={() => setVerifyOpen(false)}
        >
          <div className="bg-white p-6 rounded shadow w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            {verifyResult?.status === "verified" ? (
              <div className="text-center">
                <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-2" />
                <div className="text-xl font-semibold mb-1">Ověřeno TIČR</div>
                <div className="text-sm text-gray-600 mb-4">
                  Byl v databázi TIČR nalezen revizní technik:
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-left text-sm">
                  <div className="text-gray-500">Jméno</div>
                  <div className="font-medium">{verifyResult?.matched?.full_name || "—"}</div>
                  <div className="text-gray-500">Číslo osvědčení</div>
                  <div className="font-medium">{verifyResult?.matched?.certificate_number || "—"}</div>
                  <div className="text-gray-500">Oprávnění</div>
                  <div className="font-medium">{verifyResult?.matched?.authorization_number || "—"}</div>
                  <div className="text-gray-500">Obory</div>
                  <div className="font-medium">{(verifyResult?.matched?.scope || verifyResult?.scope || []).join(", ") || "—"}</div>
                  <div className="text-gray-500">IČO</div>
                  <div className="font-medium">—</div>
                  <div className="text-gray-500">DIČ</div>
                  <div className="font-medium">—</div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button className="btn" onClick={() => setVerifyOpen(false)}>Zavřít</button>
                  <button className="btn btn-primary" onClick={confirmRegister} disabled={loading}>
                    Pokračovat v registraci
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <XCircle className="w-14 h-14 text-red-600 mx-auto mb-2" />
                <div className="text-xl font-semibold mb-1">Není v databázi TIČR</div>
                <div className="text-sm text-gray-700 mb-4">Technik nebyl v databázi TIČR nalezen.</div>
                <div className="text-sm text-gray-600">Uvedené číslo oprávnění není nalezeno v databázi TIČR.</div>
                <div className="flex justify-center mt-6">
                  <button className="btn" onClick={() => setVerifyOpen(false)}>Rozumím</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
