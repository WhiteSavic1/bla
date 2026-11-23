"use client";

import React from "react";
import { RotateCcw } from "lucide-react";

export function PatternLockGrid({
  value,
  onChange,
  label,
}: {
  value: number[];
  onChange: (next: number[]) => void;
  label?: string;
}) {
  const toggleNode = (idx: number) => {
    if (value.includes(idx)) return;
    onChange([...value, idx]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-gray-400">
        <span>{label || "3x3 Desen (En az 3 nokta seç)"}</span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex items-center gap-1 text-indigo-300 hover:text-indigo-200"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Temizle ({value.length})</span>
          </button>
        )}
      </div>

      <div className="mx-auto grid w-44 grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-[#0F1115] p-4">
        {Array.from({ length: 9 }).map((_, idx) => {
          const order = value.indexOf(idx);
          const active = order !== -1;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleNode(idx)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-xs font-bold transition ${
                active
                  ? "border-indigo-400 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "border-white/15 bg-white/5 text-gray-500 hover:border-white/30"
              }`}
            >
              {active ? order + 1 : "•"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
