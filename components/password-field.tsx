"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";

type PasswordFieldProps = {
  name?: string;
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
};

export function PasswordField({
  name = "password",
  autoComplete = "current-password",
  placeholder = "Password",
  minLength = 8,
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background px-3 transition focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-ring/15">
      <KeyRound size={17} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      <label htmlFor={id} className="sr-only">Password</label>
      <input
        id={id}
        required
        name={name}
        type={visible ? "text" : "password"}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
