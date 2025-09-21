import React, {
  useContext,
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Tooltip from "../components/Tooltip";
import NormsSection from "../components/NormsSection";
import { RevisionFormContext, RevisionForm } from "../context/RevisionFormContext";
import { useUser } from "../context/UserContext";
import { useAuth } from "../context/AuthContext";
import { authHeader } from "../api/auth";

const voltageOptions = ["230V", "400V", "230V/400V", "12V", "24V"];
const revisionTypes = ["Výchozí", "Pravidelná", "Mimořádná"];
const networkTypes = ["TN-C", "TN-S", "TN-C-S", "TT", "IT"];

const protectionOptions = {
  basic: [
    { label: "Základní izolace", tooltip: "Izolace živých částí, která brání přímému dotyku." },
    { label: "Přepážky a kryty", tooltip: "Fyzické bariéry k živým částem." },
    { label: "Zábrany", tooltip: "Brání neúmyslnému dotyku." },
    { label: "Ochrana polohou", tooltip: "Živé části nejsou běžně přístupné." },
    { label: "Omezení napětí (ELV)", tooltip: "Napětí sníženo na bezpečnou úroveň." },
    { label: "Omezení proudu", tooltip: "Omezování proudu a náboje při dotyku." },
    { label: "Řízení potenciálu", tooltip: "Vyrovnání potenciálu mezi částmi." },
  ],
  fault: [
    { label: "Automatické odpojení od zdroje", tooltip: "Odpojení při poruše zabrání dotykovému napětí." },
    { label: "Ochranné pospojování", tooltip: "Spojení všech neživých částí a uzemnění." },
    { label: "Elektrické oddělení", tooltip: "Izolace obvodu od země a jiných obvodů." },
    { label: "Přídavná izolace", tooltip: "Druhá vrstva izolace." },
    { label: "Ochranné stínění", tooltip: "Kovový kryt nebo síť proti rušení." },
    { label: "Nevodivé okolí", tooltip: "Použité materiály s nízkou vodivostí." },
  ],
  additional: [
    { label: "Proudové chrániče (RCD)", tooltip: "Vypíná obvod při rozdílu proudu." },
    { label: "Doplňující pospojování", tooltip: "Spojuje vodivé části v místnosti kvůli bezpečí." },
  ],
};

// Typ přístroje z katalogu uživatele
type UserInstrument = {
  id: string;
  name: string;
  measurement_text: string;
  calibration_code: string;
  serial?: string | null;
  calibration_valid_until?: string | null; // YYYY-MM-DD
  note?: string | null;
};

export default function IdentifikaceSection() {
  const { form, setForm } = useContext(RevisionFormContext);
  const { profile, company, refreshCompanies, loadingCompanies } = useUser();
  const { token } = useAuth();

  // Katalog měřících přístrojů uživatele
  const [instCatalog, setInstCatalog] = useState<UserInstrument[]>([]);
  const [instLoading, setInstLoading] = useState<boolean>(false);
  const [instError, setInstError] = useState<string | null>(null);

  type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  const onField =
    (field: keyof RevisionForm) =>
    (e: ChangeEvent<FormElement>) => {
      setForm({ ...form, [field]: e.target.value });
    };

  const toggleProtection = (
    group: "basic" | "fault" | "additional",
    value: string
  ) => {
    const key = `protection_${group}` as keyof RevisionForm;
    const current = (form[key] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setForm({ ...form, [key]: updated });
  };

  // --- Vybrané přístroje v kontextu (per-revize)
  const selectedList: UserInstrument[] =
    ((form as any).measuringInstruments as UserInstrument[]) || [];
  const selectedIds = useMemo(() => new Set(selectedList.map((i) => i.id)), [selectedList]);

  const toggleInstrument = (inst: UserInstrument, checked: boolean) => {
    setForm((prev) => {
      const current: UserInstrument[] =
        ((prev as any).measuringInstruments as UserInstrument[]) || [];
      const exists = current.some((i) => i.id === inst.id);
      let next = current;
      if (checked && !exists) next = [...current, inst];
      if (!checked && exists) next = current.filter((i) => i.id !== inst.id);
      return { ...(prev as any), measuringInstruments: next } as any as RevisionForm;
    });
  };

  // Načtení katalogu přístrojů (uživatel → DB)
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!token) return;
      setInstLoading(true);
      setInstError(null);
      try {
        const res = await fetch("/api/users/instruments", {
          headers: { ...authHeader(token) },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as UserInstrument[];
        if (!alive) return;

        // normalizace + refresh detailů vybraných kusů podle aktuálního katalogu
        setInstCatalog(Array.isArray(data) ? data : []);
        setForm((prev) => {
          const current: UserInstrument[] =
            ((prev as any).measuringInstruments as UserInstrument[]) || [];
          const refreshed = current.map((sel) => data.find((d) => d.id === sel.id) || sel);
          return { ...(prev as any), measuringInstruments: refreshed } as any as RevisionForm;
        });
      } catch (e: any) {
        if (!alive) return;
        setInstError(e?.message || "Nepodařilo se načíst měřící přístroje.");
      } finally {
        if (alive) setInstLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [token, setForm]);

  // ⬇️ pouze tímto tlačítkem se propisují firemní hodnoty do revize
  const applyActiveCompanyToForm = useCallback(async () => {
    await refreshCompanies?.(); // pro jistotu aktualizace
    if (!company) {
      // žádný aktivní subjekt → vyčistit firemní údaje v revizi
      setForm((f) => ({
        ...f,
        technicianCompanyName: "",
        technicianCompanyIco: "",
        technicianCompanyDic: "",
        technicianCompanyAddress: "",
      }));
      return;
    }
    setForm((f) => ({
      ...f,
      technicianCompanyName: company.name || "",
      technicianCompanyIco: company.ico || "",
      technicianCompanyDic: company.dic || "",
      technicianCompanyAddress: company.address || "",
    }));
  }, [company, refreshCompanies, setForm]);

  return (
    <div className="bg-white shadow-md rounded p-6 space-y-6">
      <h2 className="text-2xl font-bold text-blue-800">🧾 Identifikace</h2>

      {/* Základní pole (bez montážní firmy – bude hned pod tabulkou přístrojů) */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="font-semibold">Evidenční číslo</label>
          <input
            type="text"
            value={form.evidencni || ""}
            readOnly
            className="p-2 border rounded w-full bg-gray-100"
          />
        </div>
        <div>
          <label className="font-semibold">Revidovaný objekt</label>
          <input
            type="text"
            className="p-2 border rounded w-full"
            value={form.objekt || ""}
            onChange={onField("objekt")}
          />
        </div>
        <div>
          <label className="font-semibold">Adresa</label>
          <input
            type="text"
            className="p-2 border rounded w-full"
            value={form.adresa || ""}
            onChange={onField("adresa")}
          />
        </div>
        <div>
          <label className="font-semibold">Objednatel</label>
          <input
            type="text"
            className="p-2 border rounded w-full"
            value={form.objednatel || ""}
            onChange={onField("objednatel")}
          />
        </div>
        <div>
          <label className="font-semibold">Typ revize</label>
          <select
            className="p-2 border rounded w-full"
            value={form.typRevize || ""}
            onChange={onField("typRevize")}
          >
            <option value="" disabled>— vyberte —</option>
            {revisionTypes.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-semibold">Druh sítě</label>
          <select
            className="p-2 border rounded w-full"
            value={form.sit || ""}
            onChange={onField("sit")}
          >
            <option value="" disabled>— vyberte —</option>
            {networkTypes.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-semibold">Jmenovité napětí</label>
          <input
            list="voltages"
            className="p-2 border rounded w-full"
            value={form.voltage || ""}
            onChange={onField("voltage")}
          />
          <datalist id="voltages">
            {voltageOptions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>
      </div>

      {/* 🧪 Měřící přístroje – katalog uživatele s checkboxy (ukládá se do RevisionFormContextu) */}
      <section>
        <h3 className="text-lg font-semibold mb-2">🧪 Měřící přístroje</h3>
        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 w-10 text-center">✓</th>
                <th className="p-2 text-left">Název</th>
                <th className="p-2 text-left">Měření</th>
                <th className="p-2 text-left">Kal. list</th>
                <th className="p-2 text-left">S/N</th>
                <th className="p-2 text-left">Platnost do</th>
                <th className="p-2 text-left">Pozn.</th>
              </tr>
            </thead>
            <tbody>
              {instLoading && (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-gray-500">
                    Načítám přístroje…
                  </td>
                </tr>
              )}
              {!instLoading && instError && (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-red-600">
                    {instError}
                  </td>
                </tr>
              )}
              {!instLoading && !instError && instCatalog.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-gray-500">
                    V katalogu zatím nejsou žádné přístroje.
                  </td>
                </tr>
              )}
              {!instLoading &&
                !instError &&
                instCatalog.map((it) => {
                  const checked = selectedIds.has(it.id);
                  return (
                    <tr key={it.id} className="border-t hover:bg-gray-50/60">
                      <td className="p-2 text-center align-middle">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={checked}
                          onChange={(e) => toggleInstrument(it, e.target.checked)}
                        />
                      </td>
                      <td className="p-2">{it.name}</td>
                      <td className="p-2">{it.measurement_text}</td>
                      <td className="p-2">{it.calibration_code}</td>
                      <td className="p-2">{it.serial || ""}</td>
                      <td className="p-2">{it.calibration_valid_until || ""}</td>
                      <td className="p-2">{it.note || ""}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Montážní firma – přesunuto pod tabulku přístrojů (obsah zachován) */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="font-semibold">Montážní firma</label>
          <input
            type="text"
            className="p-2 border rounded w-full"
            value={form.montFirma || ""}
            onChange={onField("montFirma")}
          />
        </div>
        <div>
          <label className="font-semibold">Oprávnění montážní firmy</label>
          <input
            type="text"
            className="p-2 border rounded w-full"
            value={form.montFirmaAuthorization || ""} // ⬅️ NOVÉ pole
            onChange={onField("montFirmaAuthorization")}
            placeholder="např. 12345/XX/EZ"
          />
        </div>
      </div>

      {/* Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(
          [
            ["date_start", "Zahájení revize"],
            ["date_end", "Ukončení revize"],
            ["date_created", "Vypracování revize"],
          ] as const
        ).map(([field, label]) => (
          <div key={field}>
            <label className="font-semibold">{label}</label>
            <input
              type="date"
              className="p-2 border rounded w-full"
              value={(form as any)[field] || ""}
              onChange={onField(field as keyof RevisionForm)}
            />
          </div>
        ))}
      </div>

      {/* Firma (z UserContextu) + tlačítko na propsání do revize */}
      <div className="grid md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="font-semibold">Firma</label>
          <input
            type="text"
            className="p-2 border rounded w-full bg-gray-100 cursor-not-allowed"
            value={form.technicianCompanyName || ""}
            readOnly
            aria-readonly
            placeholder="(nenastaveno – klikni na „Načíst aktivní subjekt“)"
            tabIndex={-1}
          />
        </div>
        <div className="flex md:justify-end">
          <button
            type="button"
            onClick={applyActiveCompanyToForm}
            disabled={loadingCompanies}
            className="h-[42px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded w-full md:w-auto"
            title="Propíše IČO/DIČ/Adresu aktivního subjektu do této revize"
          >
            {loadingCompanies ? "Načítám…" : "Načíst aktivní subjekt"}
          </button>
        </div>
      </div>

      {/* Firemní údaje uložené do této revize – pouze ke čtení, mění se jen tlačítkem výše */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="font-semibold">IČO (revize)</label>
          <input
            type="text"
            className="p-2 border rounded w-full bg-gray-100 cursor-not-allowed"
            value={form.technicianCompanyIco || ""}
            readOnly
            aria-readonly
            tabIndex={-1}
          />
        </div>
        <div>
          <label className="font-semibold">DIČ (revize)</label>
          <input
            type="text"
            className="p-2 border rounded w-full bg-gray-100 cursor-not-allowed"
            value={form.technicianCompanyDic || ""}
            readOnly
            aria-readonly
            tabIndex={-1}
          />
        </div>
        <div>
          <label className="font-semibold">Adresa (revize)</label>
          <input
            type="text"
            className="p-2 border rounded w-full bg-gray-100 cursor-not-allowed"
            value={form.technicianCompanyAddress || ""}
            readOnly
            aria-readonly
            tabIndex={-1}
          />
        </div>
      </div>

      {/* Revizní technik – read only z UserContextu */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="font-semibold">Revizní technik</label>
          <input
            type="text"
            className="p-2 border rounded w-full bg-gray-100 cursor-not-allowed"
            value={profile?.fullName || ""}
            readOnly
            aria-readonly
            tabIndex={-1}
          />
        </div>
        <div>
          <label className="font-semibold">Č. osvědčení</label>
          <input
            type="text"
            className="p-2 border rounded w-full bg-gray-100 cursor-not-allowed"
            value={profile?.certificateNumber || ""}
            readOnly
            aria-readonly
            tabIndex={-1}
          />
        </div>
        <div>
          <label className="font-semibold">Č. oprávnění</label>
          <input
            type="text"
            className="p-2 border rounded w-full bg-gray-100 cursor-not-allowed"
            value={profile?.authorizationNumber || ""}
            readOnly
            aria-readonly
            tabIndex={-1}
          />
        </div>
      </div>

      {/* Normy */}
      <NormsSection />

      {/* Ochranná opatření */}
      {(["basic", "fault", "additional"] as const).map((group) => (
        <div key={group}>
          <label className="font-semibold block mb-2 capitalize">
            {{
              basic: "Základní ochrana",
              fault: "Ochrana při poruše",
              additional: "Doplňková ochrana",
            }[group]}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {protectionOptions[group].map((p) => (
              <label key={p.label} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(form as any)[`protection_${group}`]?.includes(p.label) || false}
                  onChange={() => toggleProtection(group, p.label)}
                />
                <Tooltip text={p.tooltip}>
                  <span className="underline cursor-help">{p.label}</span>
                </Tooltip>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Další podklady */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="font-semibold">Projektová dokumentace</label>
          <input
            type="text"
            className="p-2 border rounded w-full"
            value={form.documentation || ""}
            onChange={onField("documentation")}
          />
        </div>
        <div>
          <label className="font-semibold">Posouzení vnějších vlivů</label>
          <input
            type="text"
            className="p-2 border rounded w-full"
            value={form.environment || ""}
            onChange={onField("environment")}
          />
        </div>
      </div>
      <div>
        <label className="font-semibold">Další písemné podklady</label>
        <textarea
          rows={4}
          className="p-2 border rounded w-full"
          value={form.extraNotes || ""}
          onChange={onField("extraNotes")}
        />
      </div>

      <div className="text-right">
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Pokračovat →
        </button>
      </div>
    </div>
  );
}

function L({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <label className="block">
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
