import React from "react";
import { Th, Td } from "./ui";
import { dash } from "../../summary-utils/text";
import { buildRoomDeviceSummary, hasRoomNote, roomNoteText } from "../../summary-utils/rooms";

export function RoomsBlock({ rooms }: { rooms: any[] }) {
  return (
    <>
      {rooms?.length ? (
        <div className="space-y-6">
          {rooms.map((room: any, rIdx: number) => (
            <div key={rIdx} className="mt-6">
              <div className="font-semibold">
                Prostor: {dash(room?.name) || `#${rIdx + 1}`}
              </div>
              {hasRoomNote(room) ? (
                <div className="text-sm text-slate-600">Poznámka: {roomNoteText(room)}</div>
              ) : null}
              <table className="w-full text-sm border mt-2" style={{ breakInside: "avoid" }}>
                <thead>
                  <tr className="text-left">
                    <Th>Prvek</Th>
                    <Th>Parametry</Th>
                    <Th>Měření</Th>
                    <Th>Pozn.</Th>
                  </tr>
                </thead>
                <tbody>
                  {room.devices?.length ? (
                    room.devices.map((dev: any, i: number) => {
                      const item = buildRoomDeviceSummary(dev);
                      return (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <Td><div className="whitespace-pre-line leading-6">{[item.prvek, item.prvekSubtext].filter(Boolean).join("\n")}</div></Td>
                          <Td><div className="whitespace-pre-line leading-6">{item.parametry}</div></Td>
                          <Td><div className="whitespace-pre-line leading-6">{item.mereni}</div></Td>
                          <Td><div className="whitespace-pre-line leading-6">{item.poznamka}</div></Td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <Td colSpan={4}>—</Td>
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
