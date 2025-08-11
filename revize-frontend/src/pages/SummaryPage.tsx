// src/pages/SummaryPage.tsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useRevisionForm } from "../context/RevisionFormContext";
import type { Board, Room, Device, Defect as DefectT } from "../context/RevisionFormContext";

const SummaryPage: React.FC = () => {
  const { revId } = useParams<{ revId: string }>();
  const { form } = useRevisionForm();

  // Bezpečné fallbacky (kdyby přišla prázdná/neúplná data)
  const boards: Board[] = Array.isArray(form?.boards) ? (form.boards as Board[]) : [];
  const rooms: Room[] = Array.isArray(form?.rooms) ? (form.rooms as Room[]) : [];
  const tests = form?.tests ?? {};
  const defects: DefectT[] = Array.isArray(form?.defects) ? (form.defects as DefectT[]) : [];

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar mode="summary" active="" />
      <div className="flex-1 overflow-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Souhrnná zpráva revize{" "}
            <span className="text-blue-600">#{form?.evidencni || revId}</span>
          </h1>
          {/* POZOR: route na edit je /revize/:revId */}
          <Link to={`/revize/${revId}`} className="text-sm text-blue-600 hover:underline">
            Zpět na editaci
          </Link>
        </div>

        {/* 1) Identifikace */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">1. Identifikace</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-gray-600">
            <div><dt className="font-medium">Revidovaný objekt:</dt><dd>{form?.objekt || ""}</dd></div>
            <div><dt className="font-medium">Adresa:</dt><dd>{form?.adresa || ""}</dd></div>
            <div><dt className="font-medium">Objednatel:</dt><dd>{form?.objednatel || ""}</dd></div>
            <div><dt className="font-medium">Typ revize:</dt><dd>{form?.typRevize || ""}</dd></div>
            <div><dt className="font-medium">Síť:</dt><dd>{form?.sit || ""}</dd></div>
            <div><dt className="font-medium">Jmenovité napětí:</dt><dd>{form?.voltage || ""}</dd></div>
            <div><dt className="font-medium">Datum zahájení:</dt><dd>{form?.date_start || ""}</dd></div>
            <div><dt className="font-medium">Datum ukončení:</dt><dd>{form?.date_end || ""}</dd></div>
            <div><dt className="font-medium">Vypracování protokolu:</dt><dd>{form?.date_created || ""}</dd></div>
          </dl>
          <div className="mt-6 space-y-2 text-gray-600">
            <p>
              <span className="font-medium">Normy:</span>{" "}
              {[
                ...(form?.norms || []),
                form?.customNorm1 || "",
                form?.customNorm2 || "",
                form?.customNorm3 || "",
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p><span className="font-medium">Základní ochrany:</span> {(form?.protection_basic || []).join(", ")}</p>
            <p><span className="font-medium">Ochrany při poruše:</span> {(form?.protection_fault || []).join(", ")}</p>
            <p><span className="font-medium">Doplňkové ochrany:</span> {(form?.protection_additional || []).join(", ")}</p>
          </div>
        </section>

        {/* 2) Prohlídka */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">2. Prohlídka</h2>
          <div className="space-y-4 text-gray-600">
            <div>
              <span className="font-medium">Provedené úkony:</span>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {(form?.performedTasks || []).map((task, idx) => <li key={idx}>{task}</li>)}
              </ul>
            </div>
            <div>
              <span className="font-medium">Popis objektu:</span>
              <p className="mt-1">{form?.inspectionDescription || ""}</p>
            </div>
          </div>
        </section>

        {/* 3) Zkoušky */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">3. Zkoušky</h2>
          <div className="overflow-x-auto max-w-lg mx-auto">
            <table className="w-full table-auto divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zkouška</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poznámka</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(tests).map(([testName, result], idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 text-sm text-gray-700">{testName}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{(result as any)?.note || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4) Měření – Rozvaděče */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">4. Měření – Rozvaděče</h2>
          <div className="space-y-8 mb-8">
            {boards.map((board: Board, idx: number) => (
              <div key={idx}>
                <h3 className="text-xl font-medium text-gray-800 mb-2">{board.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-gray-600 mb-4">
                  <div><span className="font-medium">Výrobce:</span> {board.vyrobce}</div>
                  <div><span className="font-medium">Typ/Model:</span> {board.typ}</div>
                  <div><span className="font-medium">SN:</span> {board.vyrobniCislo}</div>
                  <div><span className="font-medium">Napětí/Proud:</span> {board.napeti}</div>
                  <div><span className="font-medium">IP krytí:</span> {board.ip}</div>
                  <div><span className="font-medium">Přechodový odpor:</span> {board.odpor}</div>
                  <div><span className="font-medium">Umístění:</span> {board.umisteni}</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Název", "Popis", "Póly", "Dimenze", "Riso", "Ochrana"].map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(board.komponenty || []).map((c: any, i: number) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2 text-sm text-gray-700">{c.nazev}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{c.popis}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{c.poles}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{c.dimenze}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{c.riso}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{c.ochrana}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <hr className="my-4" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5) Místnosti */}
        {rooms.length > 0 && (
          <section className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">5. Místnosti</h2>
            {rooms.map((room: Room, idx: number) => (
              <div key={(room as any).id || idx} className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-1">{room.name}</h3>
                {room.details && <p className="text-gray-500 text-sm mb-2">{room.details}</p>}
                <table className="w-full table-auto divide-y divide-gray-200 mb-4">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Počet</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimenze</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ochrana</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Riso</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Podrobnosti</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(room.devices || []).map((dev: Device, didx: number) => (
                      <tr key={(dev as any).id || didx} className={didx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2 text-sm text-gray-700">{dev.typ}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{dev.pocet}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{dev.dimenze}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{dev.ochrana}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{dev.riso}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{dev.podrobnosti || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <hr className="my-4" />
              </div>
            ))}
          </section>
        )}

        {/* 6) Závady */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">6. Závady</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {defects.map((d: DefectT, didx: number) => (
              <li key={didx}>
                {d.description}{" "}
                <span className="text-gray-500 text-sm">
                  (Norma {d.standard}, Čl. {d.article})
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 7) Závěr */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">7. Závěr</h2>
          <p className="text-gray-700 mb-2">{form?.conclusion?.text || ""}</p>
          <p className="text-gray-700">
            <span className="font-medium">Bezpečnost:</span>{" "}
            {form?.conclusion?.safety === "able" ? "Instalace je bezpečná" : "Instalace není bezpečná"}
          </p>
          {form?.conclusion?.validUntil && (
            <p className="text-gray-700 mt-1">
              <span className="font-medium">Platnost do:</span> {form.conclusion.validUntil}
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default SummaryPage;
