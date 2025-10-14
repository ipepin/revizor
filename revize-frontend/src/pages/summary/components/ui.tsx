import React from "react";
import { dash } from "../../summary-utils/text";

export function H1({ children }: React.PropsWithChildren) {
  return <h2 className="text-xl font-bold mb-2">{children}</h2>;
}
export function Th({ children }: React.PropsWithChildren) {
  return <th className="py-2 px-3">{children}</th>;
}
export function Td({
  children,
  colSpan,
}: React.PropsWithChildren & { colSpan?: number }) {
  return (
    <td className="py-1.5 px-3 align-top" colSpan={colSpan}>
      {children}
    </td>
  );
}
export function KV({ label, value }: { label: string; value?: any }) {
  return (
    <div>
      <div className="text-[13px] text-slate-500">{label}</div>
      <div className="font-medium">{dash(value)}</div>
    </div>
  );
}
export function Rich({ value }: { value?: string }) {
  if (!value || !String(value).trim().length)
    return <div className="italic text-slate-400">—</div>;
  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}
