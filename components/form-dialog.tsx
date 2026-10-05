"use client";
import { useState, useTransition, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";

type Result = { error?: string; keepOpen?: boolean } | void | undefined;

// One popup pattern for every "Add …" and "Manage" action, so long create forms never stretch the page.
export function FormDialog({ trigger, triggerClassName = "button button-ghost", title, description, action, submitLabel, secondary, children }: {
  trigger: ReactNode; triggerClassName?: string; title: string; description?: ReactNode;
  action: (form: FormData) => Promise<unknown>; submitLabel: string; secondary?: ReactNode; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(form: FormData) {
    setMessage("");
    startTransition(async () => {
      try {
        const result = (await action(form)) as Result;
        if (result?.error) setMessage(result.error);
        else if (!result?.keepOpen) setOpen(false);
      } catch { setMessage("The change could not be saved. Check your connection and try again."); }
    });
  }
  return <Dialog.Root open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setMessage(""); } }}>
    <Dialog.Trigger className={triggerClassName}>{trigger}</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="record-overlay"/><Dialog.Content className="record-dialog">
      <Dialog.Title>{title}</Dialog.Title>
      {description ? <Dialog.Description>{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
      <Dialog.Close className="record-close" disabled={pending} aria-label="Close"><X size={20}/></Dialog.Close>
      <form action={submit}>
        <fieldset disabled={pending} className="record-fields">{children}</fieldset>
        {message && <p role="alert" className="camera-feedback">{message}</p>}
        <div className="record-actions">
          <span className="record-actions-secondary">{secondary}</span>
          <button type="submit" name="operation" value="update" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
        </div>
      </form>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}

// Same popup without a form, for panels that bring their own buttons (QR generator, QR details).
export function PopupPanel({ trigger, triggerClassName = "button button-ghost", title, description, children }: {
  trigger: ReactNode; triggerClassName?: string; title: string; description?: ReactNode; children: ReactNode;
}) {
  return <Dialog.Root>
    <Dialog.Trigger className={triggerClassName}>{trigger}</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="record-overlay"/><Dialog.Content className="record-dialog record-dialog-wide">
      <Dialog.Title>{title}</Dialog.Title>
      {description ? <Dialog.Description>{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
      <Dialog.Close className="record-close" aria-label="Close"><X size={20}/></Dialog.Close>
      <div className="record-body">{children}</div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
