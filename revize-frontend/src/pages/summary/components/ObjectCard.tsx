import React from "react";
import { KV, Rich } from "./ui";

export function ObjectCard({
  adresa,
  objekt,
  objednatel,
  inspectionDescription,
  voltage,
  sit,
  documentation,
  environment,
  extraNotes,
}: {
  adresa?: string;
  objekt?: string;
  objednatel?: string;
  inspectionDescription?: string;
  voltage?: string;
  sit?: string;
  documentation?: string;
  environment?: string;
  extraNotes?: string;
}) {
  return (
    <>
      <section className="mt-3" style={{ breakInside: "avoid" }}>
        <h2 className="font-semibold text-lg mb-2">Revidovaný objekt</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <KV label="Adresa stavby" value={adresa} />
          <KV label="Předmět revize" value={objekt} />
          <KV label="Objednatel revize" value={objednatel} />
        </div>
      </section>

      <section className="mb-4">
        <h2 className="font-semibold mb-2">Popis a rozsah revidovaného objektu</h2>
        <Rich value={inspectionDescription} />
      </section>

      {/* 3 položky pod sebe */}
      <section className="mb-4 text-sm space-y-1">
        <KV label="Jmenovité napětí" value={voltage} />
        <KV label="Druh sítě" value={sit} />
        <KV label="Předložená dokumentace" value={documentation} />
      </section>

      <section className="mb-4">
        <h2 className="font-semibold mb-2">Vnější vlivy</h2>
        <div className="text-sm whitespace-pre-line">{environment || "—"}</div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Přílohy</h2>
        <div className="text-sm whitespace-pre-line">{extraNotes || "—"}</div>
      </section>
    </>
  );
}
