import React from "react";
import { H1, Th, Td } from "./ui";
import { dash } from "../../summary-utils/text";
import { defectNormSuffix } from "../../summary-utils/defects";

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
            </tr>
          </thead>
          <tbody>
            {defects.map((d: any, i: number) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                <Td>
                  <span>{dash(d?.description)}</span>{" "}
                  {defectNormSuffix(d) ? <strong>{defectNormSuffix(d)}</strong> : null}
                </Td>
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
