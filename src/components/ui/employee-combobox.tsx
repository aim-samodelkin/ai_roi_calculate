"use client";

import { useEffect, useRef, useState } from "react";
import { Position } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (employee: string, hourlyRate?: number) => void;
  positions?: Position[];
  placeholder?: string;
  className?: string;
}

export function EmployeeCombobox({ value, onChange, positions = [], placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep query in sync when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = positions.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const showDropdown = open && positions.length > 0 && filtered.length > 0;

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setOpen(true);
    // auto-resize
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setOpen(true);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleSelect = (pos: Position) => {
    setQuery(pos.name);
    onChange(pos.name, pos.hourlyRate);
    setOpen(false);
    // resize after selection
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <textarea
        ref={inputRef}
        value={query}
        onChange={handleInput}
        onFocus={handleFocus}
        placeholder={placeholder}
        rows={1}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "min-h-8 h-8 resize-none overflow-hidden leading-snug",
          className
        )}
      />
      {showDropdown && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[180px] rounded-md border bg-white shadow-md">
          <ul className="py-1 max-h-48 overflow-auto">
            {filtered.map((pos) => (
              <li
                key={pos.id}
                onMouseDown={(e) => {
                  // prevent textarea blur before select fires
                  e.preventDefault();
                  handleSelect(pos);
                }}
                className="flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100"
              >
                <span className="font-medium text-gray-900">{pos.name}</span>
                <span className="text-xs text-gray-400 ml-3 shrink-0">
                  {pos.hourlyRate.toLocaleString("ru-RU")} ₽/ч
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
