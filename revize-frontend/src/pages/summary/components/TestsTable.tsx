import React from "react";
import { H1, Th, Td } from "./ui";

export function TestsTable({
  rows,
}: {
  rows: { name: string; note: string }[];
}) {
  return (
    <>
      <H1>3. Zkoušení</H1>
      <section className="mb-6">
        <div className="w-[80%] mx-auto" style={{ breakInside: "avoid" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <Th>Název zkoušky</Th>
                <Th>Poznámka / výsledek</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((t, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <Td>{t.name}</Td>
                    <Td>{t.note}</Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <Td>—</Td>
                  <Td></Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
