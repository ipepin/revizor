// src/pages/summary/components/BoardsBlock.tsx
import React from "react";
import { normalizeComponents, buildBoardComponentSummary } from "../../summary-utils/board";
import { dash } from "../../summary-utils/text";
import { Rich, Th, Td } from "./ui";

type Props = {
  boards: any[];
};

export default function BoardsBlock({ boards }: Props) {
  if (!boards || !boards.length) {
    return <div className="italic text-slate-400">—</div>;
  }

  return (
    <div className="space-y-6">
      {boards.map((board: any, bIdx: number) => {
        const flat = normalizeComponents(board?.komponenty || []);
        const boardNotes = String(board?.poznamkyHtml || board?.poznamky || "").trim();

        return (
          <div key={bIdx} className="mt-6">
            <div className="font-semibold">Rozvaděč: {dash(board?.name) || `#${bIdx + 1}`}</div>
            <div className="text-sm text-slate-600">
              Výrobce: {dash(board?.vyrobce)} | Typ: {dash(board?.typ)} | Umístění: {dash(board?.umisteni)} | S/N:{" "}
              {dash(board?.vyrobniCislo)} | Napětí: {dash(board?.napeti)} | Odpor: {dash(board?.odpor)} | IP: {dash(board?.ip)}
            </div>
            {boardNotes ? (
              <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Poznámky</div>
                <Rich value={boardNotes} />
              </div>
            ) : null}

            <table className="mt-2 w-full border text-sm" style={{ breakInside: "avoid" }} data-paginate="board-box">
              <thead>
                <tr className="text-left">
                  <Th>Prvek</Th>
                  <Th>Parametry</Th>
                  <Th>Měření</Th>
                  <Th>Pozn.</Th>
                </tr>
              </thead>
              <tbody>
                {(flat.length ? flat : [{ _level: 0, nazev: "—" }]).map((c: any, i: number) => {
                  const item = buildBoardComponentSummary(c);
                  return (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                      <Td>
                        <div className="whitespace-pre-line leading-6" style={{ paddingLeft: (c._level || 0) * 16 }}>
                          {[item.prvek, item.prvekSubtext].filter(Boolean).join("\n")}
                        </div>
                      </Td>
                      <Td><div className="whitespace-pre-line leading-6">{item.parametry}</div></Td>
                      <Td><div className="whitespace-pre-line leading-6">{item.mereni}</div></Td>
                      <Td><div className="whitespace-pre-line leading-6">{item.poznamka}</div></Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
