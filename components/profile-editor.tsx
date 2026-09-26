"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, Trash2, UserRound } from "lucide-react";
import { useFormStatus } from "react-dom";
import { removeAvatar, saveProfile, uploadAvatar } from "@/app/profile/actions";

function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? <span className="loading-dot" /> : null}
      {pending ? "Menyimpan..." : children}
    </button>
  );
}

export function ProfileEditor({
  fullName,
  username,
  email,
  avatarUrl,
  organizer,
}: {
  fullName: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  organizer: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);
  const [fileName, setFileName] = useState("");
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    setPreview(objectUrl.current);
    setFileName(file.name);
  }

  return (
    <div className="profile-editor-grid">
      <section className="profile-card liquid-panel profile-identity-card">
        <div className="profile-avatar-row">
          <div
            className="profile-avatar-xl"
            style={preview ? { backgroundImage: `url("${preview}")` } : undefined}
          >
            {!preview && <UserRound size={34} />}
          </div>
          <div className="profile-avatar-copy">
            <span className="section-kicker">Profile photo</span>
            <h2>{fullName}</h2>
            <p>{organizer ? "Organizer account" : "Attendee account"}</p>
          </div>
        </div>

        <form action={uploadAvatar} className="profile-avatar-form">
          <label className="profile-avatar-picker">
            <input
              type="file"
              name="avatar"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={selectAvatar}
            />
            <span className="profile-avatar-picker-icon">
              <Camera size={17} />
            </span>
            <span>
              <strong>{fileName || "Pilih foto baru"}</strong>
              <small>JPG, PNG, WEBP · maksimal 2 MB</small>
            </span>
          </label>
          <div className="profile-avatar-actions">
            <SubmitButton className="button button-dark">
              <ImagePlus size={15} /> Simpan foto
            </SubmitButton>
          </div>
        </form>

        {avatarUrl && (
          <form action={removeAvatar} className="profile-remove-avatar">
            <SubmitButton className="button button-ghost">
              <Trash2 size={15} /> Hapus foto
            </SubmitButton>
          </form>
        )}
      </section>

      <section className="profile-card liquid-panel">
        <div className="profile-section-heading">
          <div>
            <span className="section-kicker">Identity</span>
            <h2>Informasi profil</h2>
          </div>
          <span className="profile-role-pill">{organizer ? "Organizer" : "Attendee"}</span>
        </div>

        <form action={saveProfile} className="profile-details-form">
          <label>
            <span>Nama tampilan</span>
            <input
              name="fullName"
              required
              minLength={2}
              maxLength={60}
              defaultValue={fullName}
              autoComplete="name"
              placeholder="Nama lengkap"
            />
          </label>
          <label>
            <span>Username</span>
            <div className="profile-username-field">
              <span>@</span>
              <input
                name="username"
                required
                minLength={3}
                maxLength={24}
                pattern="[a-zA-Z0-9_]{3,24}"
                autoComplete="username"
                defaultValue={username}
                placeholder="username"
              />
            </div>
          </label>
          <label>
            <span>Email</span>
            <input value={email} readOnly disabled />
            <small>Email mengikuti akun autentikasi PassFlow.</small>
          </label>
          <div className="profile-save-row">
            <span className="profile-save-note">
              <Check size={14} /> Perubahan tampil di dashboard dan navbar.
            </span>
            <SubmitButton className="button button-dark">Simpan profil</SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}
