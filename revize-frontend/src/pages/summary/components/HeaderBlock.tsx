import React from "react";
import { dash } from "../../summary-utils/text";

function shortUuid(uuid?: string) {
  const value = (uuid || "").trim().replace(/^REV-/, "");
  if (!value) return "";
  return value.slice(-8);
}

export function HeaderBlock({
  evidencni,
  uuid,
  revId,
  typRevize,
  normsAll,
}: {
  evidencni?: string;
  uuid?: string;
  revId?: string | number;
  typRevize?: string;
  normsAll: string[];
}) {
  const shownUuid = shortUuid(uuid);

  return (
    <header className="mb-4" style={{ breakInside: "avoid" }}>
      <div className="mt-1 text-left">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {"Eviden\u010dn\u00ed \u010d\u00edslo"}
        </div>
        <div className="text-2xl font-bold text-slate-900">
          {dash(evidencni || revId)}
        </div>
        {!!shownUuid && (
          <div className="mt-1 text-xs font-medium text-slate-500">
            {"UUID: "}{shownUuid}
          </div>
        )}
      </div>
      <div className="mt-2 w-full text-center">
        <h1 className="text-2xl font-bold tracking-wide">
          {"Revizn\u00ed zpr\u00e1va o elektrick\u00e9 instalaci"}
        </h1>
        <div className="mt-1 text-base font-semibold">{dash(typRevize)}</div>
        <div className="mt-1 text-xs text-slate-500">
          {normsAll.length ? (
            <>V souladu s {normsAll.join(", ")}</>
          ) : (
            <>{"V souladu s Chyb\u00ed informace"}</>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-300 to-transparent" />
        <div className="h-2 w-2 rounded-full bg-slate-300" />
        <div className="h-px flex-1 bg-gradient-to-l from-slate-200 via-slate-300 to-transparent" />
      </div>
    </header>
  );
}
