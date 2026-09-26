"use client";

import { FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";
import { CheckCircle2, ImagePlus, LoaderCircle, UploadCloud, X } from "lucide-react";
import { uploadEventAsset } from "@/app/admin/actions";

type AssetType = "logo" | "hero" | "poster" | "qr_template";

export function AssetUploadCard({
  eventId,
  assetType,
  label,
  currentUrl,
  hint = "JPG, PNG, WEBP · max 5 MB",
  compact = false,
  onUploaded,
  onPreview,
}: {
  eventId: string;
  assetType: AssetType;
  label: string;
  currentUrl?: string | null;
  hint?: string;
  compact?: boolean;
  onUploaded?: (url: string) => void;
  onPreview?: (url: string | null) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPreview(currentUrl ?? null);
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function selectFile(file?: File) {
    setMessage(null);
    setSuccess(false);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Format harus JPG, PNG, atau WEBP.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Ukuran file maksimal 5 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    setPreview(objectUrlRef.current);
    onPreview?.(objectUrlRef.current);
    setFileName(file.name);
  }

  function clearSelection() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPreview(currentUrl ?? null);
    onPreview?.(currentUrl ?? null);
    setFileName("");
    setMessage(null);
    setSuccess(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setMessage(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const result = await uploadEventAsset(data);
        setMessage(result.message);
        setSuccess(result.ok);
        if (result.ok && result.publicUrl) {
          setPreview(result.publicUrl);
          onPreview?.(result.publicUrl);
          onUploaded?.(result.publicUrl);
          setFileName("");
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
          if (inputRef.current) inputRef.current.value = "";
        }
      } catch {
        setMessage("Upload belum berhasil. Periksa koneksi lalu coba lagi.");
        setSuccess(false);
      }
    });
  }

  return (
    <form className={`asset-upload-form ${compact ? "is-compact" : ""}`} onSubmit={submit}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="assetType" value={assetType} />
      <label
        htmlFor={inputId}
        className={`asset-upload-card ${preview ? "has-preview" : ""}`}
        style={preview ? { backgroundImage: `linear-gradient(rgba(10,10,10,.12), rgba(10,10,10,.42)), url("${preview}")` } : undefined}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(event) => selectFile(event.target.files?.[0])}
        />
        <span className="asset-upload-icon">
          {preview ? <ImagePlus size={18} /> : <UploadCloud size={19} />}
        </span>
        <span className="asset-upload-copy">
          <strong>{fileName || (preview ? `Ganti ${label.toLowerCase()}` : label)}</strong>
          <small>{fileName || hint}</small>
        </span>
      </label>

      <div className="asset-upload-actions">
        <button
          className="button button-dark"
          type="submit"
          disabled={pending || !inputRef.current?.files?.length}
        >
          {pending ? <LoaderCircle className="animate-spin" size={15} /> : <UploadCloud size={15} />}
          {pending ? "Uploading..." : "Upload"}
        </button>
        {fileName && (
          <button className="button button-ghost" type="button" onClick={clearSelection}>
            <X size={15} /> Batal
          </button>
        )}
      </div>

      {message && (
        <p className={success ? "asset-upload-status is-success" : "asset-upload-status is-error"}>
          {success && <CheckCircle2 size={14} />}
          {message}
        </p>
      )}
    </form>
  );
}
