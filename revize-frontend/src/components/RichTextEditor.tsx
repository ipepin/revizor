import React, { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeightClassName = "min-h-[220px]",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const lastSyncedRef = useRef<string>("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = value || "";
    if ((el.innerHTML || "") !== next) el.innerHTML = next;
    lastSyncedRef.current = next;
  }, [value]);

  const ensureSelection = () => {
    const el = ref.current;
    if (!el) return;
    const selection = window.getSelection();
    if (!selection) return;
    if (selection.rangeCount > 0) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const syncValue = () => {
    const next = ref.current?.innerHTML || "";
    if (next === lastSyncedRef.current) return;
    lastSyncedRef.current = next;
    onChange(next);
  };

  const run = (cmd: string, commandValue?: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    ensureSelection();
    document.execCommand(cmd, false);
    if (commandValue != null) document.execCommand(cmd, false, commandValue);
    syncValue();
  };

  return (
    <div className="rounded border bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b bg-slate-50 p-2">
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-slate-100"
          onMouseDown={(e) => {
            e.preventDefault();
            run("bold");
          }}
          title="Tučně"
        >
          B
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs italic hover:bg-slate-100"
          onMouseDown={(e) => {
            e.preventDefault();
            run("italic");
          }}
          title="Kurzíva"
        >
          I
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-slate-100"
          onMouseDown={(e) => {
            e.preventDefault();
            run("insertUnorderedList");
          }}
          title="Odrážky"
        >
          • Seznam
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-slate-100"
          onMouseDown={(e) => {
            e.preventDefault();
            run("insertOrderedList");
          }}
          title="Číslovaný seznam"
        >
          1. Seznam
        </button>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={`prose prose-sm max-w-none w-full p-3 text-sm leading-7 focus:outline-none
          [&_ul]:list-disc [&_ul]:pl-6
          [&_ol]:list-decimal [&_ol]:pl-6
          [&_li]:my-1
          ${minHeightClassName}`}
        onInput={syncValue}
        data-placeholder={placeholder || ""}
        style={{ whiteSpace: "normal" }}
      />
    </div>
  );
}
