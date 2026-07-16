"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Option = {
  label: string;
  value: string;
};

type CustomSelectProps = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = "Select",
  className,
}: CustomSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={cn("h-11 w-full border-border bg-card/70", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
