import React from "react";
import { KV } from "./ui";

export function TechnicianCard({
  tech,
}: {
  tech: {
    jmeno: string;
    firma: string;
    cislo_osvedceni: string;
    ico: string;
    cislo_opravneni: string;
    dic: string;
    adresa: string;
    phone: string;
    email: string;
  };
}) {
  return (
    <section style={{ breakInside: "avoid" }}>
      <h2 className="font-semibold text-lg mb-2">Revizní technik</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <KV label="Jméno" value={tech.jmeno} />
        <KV label="Firma" value={tech.firma} />
        <KV label="Ev. č. osvědčení" value={tech.cislo_osvedceni} />
        <KV label="IČO" value={tech.ico} />
        <KV label="Ev. č. oprávnění" value={tech.cislo_opravneni} />
        <KV label="DIČ" value={tech.dic} />
        <KV label="Adresa" value={tech.adresa} />
        <KV label="Telefon" value={tech.phone} />
        <KV label="E-mail" value={tech.email} />
      </div>
    </section>
  );
}
