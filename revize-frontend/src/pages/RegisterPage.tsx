import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, CheckCircle, XCircle, Loader2, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { RegisterPayload } from "../api/auth";
import { lookupRt, type RtLookupResponse } from "../api/auth";

const initialForm: RegisterPayload = {
  name: "",
  email: "",
  password: "",
  phone: "",
  certificate_number: "",
  authorization_number: "",
  address: "",
  ico: "",
  dic: "",
};

type DialogMode = "verified" | "not-found" | "success";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState<RegisterPayload>(initialForm);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [verifyResult, setVerifyResult] = useState<RtLookupResponse | null>(null);

  const passwordTooShort = useMemo(
    () => form.password.length > 0 && form.password.length < 8,
    [form.password]
  );
  const passwordMismatch = useMemo(
    () => confirm.length > 0 && confirm !== form.password,
    [confirm, form.password]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (passwordMismatch) {
      setError("Hesla se neshodují.");
      return;
    }

    if (passwordTooShort) {
      setError("Heslo musí mít alespoň 8 znaků.");
      return;
    }

    if (!form.certificate_number.trim()) {
      setError("Vyplňte číslo osvědčení.");
      return;
    }

    try {
      setChecking(true);
      const res = await lookupRt({
        name: form.name,
        certificate_number: form.certificate_number,
      });
      setVerifyResult(res);

      if (res.status === "verified") {
        setError(null);
        setDialogMode("verified");
      } else {
        setDialogMode("not-found");
        setError("Technik nebyl nalezen v databázi TIČR. Zkontrolujte prosím zadané údaje.");
      }
    } catch (err) {
      const message =
        (err as any)?.response?.data?.detail ||
        (err as Error).message ||
        "Ověření TIČR se nepodařilo.";
      setError(message);
      setDialogMode(null);
      setVerifyResult(null);
    } finally {
      setChecking(false);
    }
  };

  const confirmRegister = async () => {
    if (dialogMode !== "verified" || verifyResult?.status !== "verified") {
      setDialogMode(null);
      return;
    }

    try {
      setRegistering(true);
      await register(form);
      setError(null);
      setSuccess("Úspěšně zaregistrováno. Zkuste se přihlásit.");
      setForm(initialForm);
      setConfirm("");
      setDialogMode("success");
      setVerifyResult(null);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      const message =
        (err as any)?.response?.data?.detail ||
        (err as Error).message ||
        "Registrace se nepodařila.";
      setError(message);
      setDialogMode(null);
    } finally {
      setRegistering(false);
    }
  };

  const closeDialog = () => {
    if (registering) {
      return;
    }
    setDialogMode(null);
    if (dialogMode !== "success") {
      setVerifyResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-10 lg:py-16">
        <header className="flex flex-col items-center gap-3 text-center">
          <UserPlus className="h-12 w-12 text-sky-600" />
          <h1 className="text-3xl font-semibold sm:text-4xl">Registrace technika</h1>
          <p className="max-w-2xl text-base text-slate-600">
            Vytvořte si účet v Revizoru, ověřte své údaje v databázi TIČR a získejte přístup k moderním
            nástrojům pro správu revizních zpráv, přehledům i exportům.
          </p>
        </header>

        <main className="mt-12 grid gap-10 lg:grid-cols-[1.1fr,1fr]">
          <section className="order-2 rounded-3xl bg-white shadow-xl ring-1 ring-slate-100 lg:order-1">
            <div className="px-6 py-10 sm:px-10">
              <h2 className="text-xl font-semibold text-slate-900">Vyplňte registrační údaje</h2>
              <p className="mt-2 text-sm text-slate-600">
                Formulář je jednoduše v jednom sloupci, abyste mohli údaje vyplnit rychle a bez zbytečného
                přeskakování pohledem.
              </p>

              <form
                className="mt-8 flex w-full flex-col gap-5"
                onSubmit={handleSubmit}
              >
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Jméno
                  <input
                    required
                    name="name"
                    placeholder="např. Jan Svoboda"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    value={form.name}
                    onChange={handleChange}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  E-mail
                  <input
                    required
                    type="email"
                    name="email"
                    placeholder="např. jan.svoboda@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    value={form.email}
                    onChange={handleChange}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Telefon
                  <input
                    required
                    name="phone"
                    placeholder="např. +420 777 888 999"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Číslo osvědčení
                  <input
                    required
                    name="certificate_number"
                    placeholder="např. 1234/23/R-EZ-E2A"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    value={form.certificate_number}
                    onChange={handleChange}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Číslo oprávnění
                  <input
                    name="authorization_number"
                    placeholder="pokud máte, uveďte ho"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    value={form.authorization_number || ""}
                    onChange={handleChange}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Adresa
                  <input
                    name="address"
                    placeholder="Sídlo nebo provozovna"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    value={form.address || ""}
                    onChange={handleChange}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  IČO
                  <input
                    name="ico"
                    placeholder="např. 12345678"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    value={form.ico || ""}
                    onChange={handleChange}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  DIČ
                  <input
                    name="dic"
                    placeholder="např. CZ12345678"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    value={form.dic || ""}
                    onChange={handleChange}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Heslo
                  <input
                    required
                    type="password"
                    name="password"
                    placeholder="minimálně 8 znaků"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    value={form.password}
                    onChange={handleChange}
                  />
                </label>
                {passwordTooShort && (
                  <p className="text-sm text-amber-600">Heslo musí mít alespoň 8 znaků.</p>
                )}

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Potvrzení hesla
                  <input
                    required
                    type="password"
                    placeholder="Zopakujte heslo"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
                {passwordMismatch && (
                  <p className="text-sm text-red-600">Hesla se neshodují.</p>
                )}

                {error && <p className="text-center text-sm text-red-600">{error}</p>}
                {success && <p className="text-center text-sm text-emerald-600">{success}</p>}

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  disabled={checking || registering || passwordTooShort || passwordMismatch}
                >
                  {checking ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Ověřuji TIČR…
                    </span>
                  ) : (
                    "Ověřit v TIČR"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600">
                Už máte účet?{" "}
                <Link to="/login" className="font-medium text-sky-600 hover:text-sky-700">
                  Přihlásit se
                </Link>
              </p>
            </div>
          </section>

          <aside className="order-1 h-full rounded-3xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-600 p-8 text-white shadow-xl ring-1 ring-blue-500/40 lg:order-2 lg:p-10">
            <h2 className="text-2xl font-semibold">Proč Revizor?</h2>
            <p className="mt-3 text-sm text-white/80">
              Webová aplikace navržená pro revizní techniky. Udržujte revizní zprávy přehledně a v souladu s
              požadavky úřadů.
            </p>
            <ul className="mt-8 space-y-5 text-sm">
              <li className="flex gap-3">
                <span className="mt-1 rounded-full bg-white/10 p-2 text-white">
                  <CheckCircle className="h-5 w-5" />
                </span>
                <span>
                  Okamžité ověření v databázi TIČR a předvyplněné údaje technika.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 rounded-full bg-white/10 p-2 text-white">
                  <CheckCircle className="h-5 w-5" />
                </span>
                <span>
                  Přehled projektů, katalog závad a generování dokumentů jedním klikem.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 rounded-full bg-white/10 p-2 text-white">
                  <CheckCircle className="h-5 w-5" />
                </span>
                <span>
                  Podpora týmu Revizor je připravena vám pomoci na adrese support@revizor.cz.
                </span>
              </li>
            </ul>

            <div className="mt-10 rounded-2xl bg-white/10 p-5 text-sm text-white/90">
              <p className="font-medium uppercase tracking-wide text-white/80">Tip</p>
              <p className="mt-2">
                Ověření TIČR probíhá online a může chvíli trvat. Nebojte se počkat – ukazatel načítání vás
                udrží v obraze.
              </p>
            </div>
          </aside>
        </main>
      </div>

      {dialogMode && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 px-4 backdrop-blur-sm"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {dialogMode === "verified" && verifyResult?.status === "verified" && (
              <div className="space-y-6 text-center">
                <CheckCircle className="mx-auto h-14 w-14 text-emerald-500" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Ověřeno v TIČR</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Na zadané číslo osvědčení byl v databázi TIČR nalezen záznam technika.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-left text-sm">
                  <span className="text-slate-500">Jméno</span>
                  <span className="font-medium text-slate-900">
                    {verifyResult.matched?.full_name || "-"}
                  </span>
                  <span className="text-slate-500">Číslo osvědčení</span>
                  <span className="font-medium text-slate-900">
                    {verifyResult.matched?.certificate_number || form.certificate_number}
                  </span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    className="btn btn-outline w-full rounded-xl normal-case sm:w-auto"
                    onClick={closeDialog}
                    disabled={registering}
                  >
                    Zavřít
                  </button>
                  <button
                    className="btn btn-primary w-full rounded-xl normal-case sm:w-auto"
                    onClick={confirmRegister}
                    disabled={registering}
                  >
                    {registering ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Registruji…
                      </span>
                    ) : (
                      "Pokračovat v registraci"
                    )}
                  </button>
                </div>
              </div>
            )}

            {dialogMode === "not-found" && (
              <div className="space-y-6 text-center">
                <XCircle className="mx-auto h-14 w-14 text-red-500" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Technik nebyl nalezen</h3>
                  <p className="mt-2 text-sm text-slate-700">
                    Technik se zadaným číslem osvědčení nebyl v databázi TIČR nalezen. Zkontrolujte prosím
                    správnost údajů a zkuste to znovu.
                  </p>
                </div>
                <button
                  className="btn btn-outline w-full rounded-xl normal-case"
                  onClick={closeDialog}
                >
                  Rozumím
                </button>
              </div>
            )}

            {dialogMode === "success" && (
              <div className="space-y-6 text-center">
                <CheckCircle className="mx-auto h-14 w-14 text-emerald-500" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Registrace dokončena</h3>
                  <p className="mt-2 text-sm text-slate-700">
                    Úspěšně zaregistrováno. Zkuste se přihlásit.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    className="btn btn-outline w-full rounded-xl normal-case sm:w-auto"
                    onClick={closeDialog}
                  >
                    Zůstat zde
                  </button>
                  <button
                    className="btn btn-accent w-full rounded-xl normal-case sm:w-auto"
                    onClick={() => navigate("/login")}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <LogIn className="h-5 w-5" />
                      Přihlásit se
                    </span>
                  </button>
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