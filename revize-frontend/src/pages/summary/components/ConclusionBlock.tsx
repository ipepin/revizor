import React from "react";
import { H1 } from "./ui";

export function ConclusionBlock({
  text,
  safetyLabel,
  validUntil,
}: {
  text?: string;
  safetyLabel: string;
  validUntil?: string;
}) {
  return (
    <>
      <H1>6. Závěr</H1>
      <section style={{ breakInside: "avoid" }}>
        <div className="space-y-4 text-sm">
          <div className="whitespace-pre-line">{text || "—"}</div>
          <div className="border-2 border-slate-700 rounded-md p-3">
            <div className="text-xl font-extrabold tracking-wide">{safetyLabel}</div>
          </div>
          <div>
            Další revize: <strong>{validUntil || "—"}</strong>
          </div>
        </div>
      </section>
    </>
  );
}
