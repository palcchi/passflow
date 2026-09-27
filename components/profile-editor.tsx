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
  const [fileError, setFileError] = useState("");
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setFileError("Choose a JPG, PNG, or WEBP image up to 2 MB.");
      event.target.value = "";
      setFileName("");
      return;
    }
    setFileError("");
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
              <strong>{fileName || "Choose a new photo"}</strong>
              <small>JPG, PNG, or WEBP · max 2 MB</small>
            </span>
          </label>
          <div className="profile-avatar-actions">
            <SubmitButton className="button button-dark">
              <ImagePlus size={15} /> Save photo
            </SubmitButton>
          </div>
        </form>
        {fileError && <p role="alert" className="auth-notice">{fileError}</p>}

        {avatarUrl && (
          <form action={removeAvatar} className="profile-remove-avatar">
            <SubmitButton className="button button-ghost">
              <Trash2 size={15} /> Remove photo
            </SubmitButton>
          </form>
        )}
      </section>

      <section className="profile-card liquid-panel">
        <div className="profile-section-heading">
          <div>
            <span className="section-kicker">Identity</span>
            <h2>Profile information</h2>
          </div>
          <span className="profile-role-pill">{organizer ? "Organizer" : "Attendee"}</span>
        </div>

        <form action={saveProfile} className="profile-details-form">
          <label>
            <span>Display name</span>
            <input
              name="fullName"
              required
              minLength={2}
              maxLength={60}
              defaultValue={fullName}
              autoComplete="name"
              placeholder="Enter your full name"
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
                placeholder="e.g. vallian"
              />
            </div>
          </label>
          <label>
            <span>Email</span>
            <input value={email} readOnly disabled />
            <small>Email is managed through your PassFlow authentication account.</small>
          </label>
          <div className="profile-save-row">
            <span className="profile-save-note">
              <Check size={14} /> Changes appear across your dashboard and navigation.
            </span>
            <SubmitButton className="button button-dark">Save profile</SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}
