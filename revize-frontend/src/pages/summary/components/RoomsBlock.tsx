import React from "react";
import { H1, Th, Td } from "./ui";
import { dash } from "../../summary-utils/text";

export function RoomsBlock({ rooms }: { rooms: any[] }) {
  return (
    <>
      {rooms?.length ? (
        <div className="space-y-6">
          {rooms.map((room: any, rIdx: number) => (
            <div key={rIdx} className="mt-6">
              <div className="font-semibold">
                Místnost: {dash(room?.name) || `#${rIdx + 1}`}
              </div>
              <div className="text-sm text-slate-600">
                Poznámka: {dash(room?.details)}
              </div>
              <table className="w-full text-sm border mt-2" style={{ breakInside: "avoid" }}>
                <thead>
                  <tr className="text-left">
                    <Th>Typ</Th>
                    <Th>Počet</Th>
                    <Th>Dimenze</Th>
                    <Th>Riso [MΩ]</Th>
                    <Th>Ochrana [Ω]</Th>
                    <Th>Poznámka</Th>
                  </tr>
                </thead>
                <tbody>
                  {room.devices?.length ? (
                    room.devices.map((dev: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        <Td>{dash(dev?.typ)}</Td>
                        <Td>{dash(dev?.pocet)}</Td>
                        <Td>{dash(dev?.dimenze)}</Td>
                        <Td>{dash(dev?.riso)}</Td>
                        <Td>{dash(dev?.ochrana)}</Td>
                        <Td>{dash(dev?.podrobnosti || dev?.note)}</Td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <Td colSpan={6}>—</Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <div className="italic text-slate-400">—</div>
      )}
    </>
  );
}
