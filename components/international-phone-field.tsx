"use client";

import { useState } from "react";
import PhoneInput from "react-phone-number-input";
import type { E164Number } from "libphonenumber-js/core";

export function InternationalPhoneField({
  id,
  name = "phone",
  placeholder = "Enter phone number",
  defaultValue,
  required = true,
}: {
  id: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState<E164Number | undefined>(
    defaultValue ? (defaultValue as E164Number) : undefined,
  );

  return (
    <div className="international-phone-field">
      <PhoneInput
        id={id}
        defaultCountry="ID"
        international
        value={value}
        onChange={(next) => setValue(next)}
        placeholder={placeholder}
        required={required}
        autoComplete="tel"
        countryCallingCodeEditable={false}
        aria-label="Phone or WhatsApp number with country calling code"
      />
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}
