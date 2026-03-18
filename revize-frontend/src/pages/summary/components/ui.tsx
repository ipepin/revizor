import React from "react";
import { dash } from "../../summary-utils/text";

export function H1({ children }: React.PropsWithChildren) {
  return <h2 className="mb-3 text-xl font-semibold tracking-tight text-slate-900">{children}</h2>;
}
export function Th({ children }: React.PropsWithChildren) {
  return <th className="px-3 py-2 text-[13px] font-semibold text-slate-600">{children}</th>;
}
export function Td({
  children,
  colSpan,
}: React.PropsWithChildren & { colSpan?: number }) {
  return (
    <td className="px-3 py-2 align-top text-sm leading-6 text-slate-800" colSpan={colSpan}>
      {children}
    </td>
  );
}
export function KV({ label, value }: { label: string; value?: any }) {
  return (
    <div>
      <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-0.5 text-[15px] font-medium leading-6 text-slate-900">{dash(value)}</div>
    </div>
  );
}
export function Rich({ value }: { value?: string }) {
  if (!value || !String(value).trim().length)
    return <div className="italic text-slate-400">—</div>;
  return (
    <div
      className="prose prose-sm max-w-none leading-6 text-slate-800 prose-headings:font-semibold prose-headings:text-slate-900 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0"
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}
