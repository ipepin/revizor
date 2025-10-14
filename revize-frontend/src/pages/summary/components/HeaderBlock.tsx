import React from "react";
import { dash } from "../../summary-utils/text";

export function HeaderBlock({
  evidencni,
  revId,
  typRevize,
  normsAll,
}: {
  evidencni?: string;
  revId?: string | number;
  typRevize?: string;
  normsAll: string[];
}) {
  return (
    <header className="mb-4" style={{ breakInside: "avoid" }}>
      <div className="mt-1 text-sm text-left">
        Číslo revizní zprávy: <strong>{dash(evidencni || revId)}</strong>
      </div>
      <div className="w-full text-center mt-1">
        <h1 className="text-2xl font-bold tracking-wide">
          Zpráva o revizi elektrické instalace
        </h1>
        <div className="text-base font-semibold mt-1">{dash(typRevize)}</div>
        <div className="mt-1 text-xs text-slate-500">
          {normsAll.length ? (
            <>V souladu s {normsAll.join(", ")}</>
          ) : (
            <>V souladu s Chybí informace</>
          )}
        </div>
      </div>
      <hr className="mt-3 border-slate-200" />
    </header>
  );
}
