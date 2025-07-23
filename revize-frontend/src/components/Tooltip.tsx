import React from "react";

type TooltipProps = {
  text: string;
  children: React.ReactNode;
};

export default function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className="group relative inline-block">
      {children}
      <span className="absolute z-10 hidden group-hover:block bg-gray-700 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 text-center">
        {text}
      </span>
    </span>
  );
}
