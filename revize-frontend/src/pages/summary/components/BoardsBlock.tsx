// src/pages/summary/components/BoardsBlock.tsx
import React from "react";
import { normalizeComponents, depthPrefix, buildComponentLine } from "../../summary-utils/board";
import { dash } from "../../summary-utils/text";
import { Rich } from "./ui";

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

            <div className="mt-2 divide-y rounded border border-slate-200" data-paginate="board-box">
              {flat.map((c: any, i: number) => {
                const prefix = depthPrefix(c._level);
                const name = dash(c?.nazev || c?.name);
                const desc = dash(c?.popis || c?.description || "");
                const line = buildComponentLine(c);

                return (
                  <div
                    key={i}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                    style={{ breakInside: "avoid", paddingLeft: 12 + c._level * 18 }}
                  >
                    <div className="px-3 py-2">
                      <div className="font-medium">
                        <span className="mr-1 whitespace-pre font-mono text-slate-500">{prefix}</span>
                        {name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {desc !== "Chybí informace" && <span className="mr-2">{desc}</span>}
                        {line}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
