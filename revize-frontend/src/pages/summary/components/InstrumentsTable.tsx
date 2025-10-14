import React from "react";
import { Th, Td } from "./ui";

export function InstrumentsTable({
  instruments,
}: {
  instruments: { id: string; name: string; serial: string; calibration: string }[];
}) {
  return (
    <section className="mt-4" style={{ breakInside: "avoid" }}>
      <h2 className="font-semibold text-lg mb-2">Použité měřicí přístroje</h2>
      <table className="w-full text-sm border">
        <thead>
          <tr className="text-left">
            <Th>Přístroj</Th>
            <Th>Výrobní číslo</Th>
            <Th>Kalibrační list</Th>
          </tr>
        </thead>
        <tbody>
          {instruments.length ? (
            instruments.map((inst) => (
              <tr key={inst.id}>
                <Td>{inst.name}</Td>
                <Td>{inst.serial}</Td>
                <Td>{inst.calibration}</Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
