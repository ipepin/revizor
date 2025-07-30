// src/components/ComponentRow.tsx

import React, { useRef } from "react";
import { Komponenta } from "../context/RevisionFormContext";
import { useOnClickOutside } from "../hooks/useOnClickOutside";

interface Props {
  c: Komponenta;
  index: number;
  isEditing: boolean;
  onSelect: () => void;
  onEditToggle: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onSave: () => void;
  renderCell: (
    c: Komponenta,
    field: keyof Komponenta,
    isEd: boolean
  ) => React.ReactNode;
}

const componentFields: (keyof Komponenta)[] = [
  "nazev",
  "popis",
  "typ",
  "poles",
  "dimenze",
  "riso",
  "ochrana",
  "poznamka",
];

export default function ComponentRow({
  c,
  index,
  isEditing,
  onSelect,
  onEditToggle,
  onCopy,
  onDelete,
  onSave,
  renderCell,
}: Props) {
  // ref na <tr>
const rowRef = useRef<HTMLTableRowElement>(null);;

// kliknutí mimo tento <tr> ukončí editaci
useOnClickOutside(rowRef, () => {
  if (isEditing) {
    onSave();
  }
});

  return (
    <tr
      ref={rowRef}
      className="border-t cursor-pointer"
      onClick={onSelect}
    >
      <td className="p-2 text-center">{index + 1}</td>
      {componentFields.map((field) => (
        <td key={field} className="p-2 text-center">
          {renderCell(c, field, isEditing)}
        </td>
      ))}
      <td className="p-2 text-center space-x-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditToggle();
          }}
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
        >
          📋
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          ❌
        </button>
        {isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            className="ml-2 text-green-600"
          >
            ✔️
          </button>
        )}
      </td>
    </tr>
  );
}
