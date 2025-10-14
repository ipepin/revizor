import React from "react";
import { H1, Th, Td } from "./ui";
import { dash } from "../../summary-utils/text";

export function DefectsTable({
  defects,
}: {
  defects: any[];
}) {
  return (
    <>
      {defects?.length ? (
        <table className="w-full text-sm" style={{ breakInside: "avoid" }}>
          <thead>
            <tr className="text-left">
              <Th>Popis závady</Th>
              <Th>ČSN</Th>
              <Th>Článek</Th>
            </tr>
          </thead>
          <tbody>
            {defects.map((d: any, i: number) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                <Td>{dash(d?.description)}</Td>
                <Td>{dash(d?.standard)}</Td>
                <Td>{dash(d?.article)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="italic text-slate-400">—</div>
      )}
    </>
  );
}
