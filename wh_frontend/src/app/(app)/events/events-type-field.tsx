"use client";

import { useMemo } from "react";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type EventsTypeFieldProps = {
  savedTypes: string[];
  defaultValue?: string;
  fieldId: string;
  name?: string;
};

export function EventsTypeField({
  savedTypes,
  defaultValue = "",
  fieldId,
  name = "eventType"
}: EventsTypeFieldProps) {
  const normalizedTypes = useMemo(
    () => Array.from(new Set(savedTypes.map((type) => type.trim()).filter(Boolean))),
    [savedTypes]
  );

  const hasDefaultInList = normalizedTypes.includes(defaultValue.trim());
  const options = hasDefaultInList || !defaultValue.trim() ? normalizedTypes : [defaultValue.trim(), ...normalizedTypes];

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>Type</Label>
      <Select id={fieldId} name={name} required defaultValue={options[0] ?? ""} disabled={options.length === 0}>
        {options.length > 0 ? (
          options.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))
        ) : (
          <option value="">No saved types yet</option>
        )}
      </Select>
      {options.length === 0 ? (
        <p className="text-sm text-[#4a5f83]">Create a type from the Backlog Types tab first.</p>
      ) : null}
    </div>
  );
}
