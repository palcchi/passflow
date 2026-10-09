"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, UserRound } from "lucide-react";
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
      {pending ? "Saving..." : children}
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
    <div className="ui-settings">
      <section className="ui-card ui-settings-card" aria-labelledby="photo-title">
        <div className="ui-settings-side">
          <h2 id="photo-title" className="ui-h3">Photo</h2>
          <p>Shown on your passes and to organizers of events you join.</p>
        </div>
        <div className="ui-stack">
          <div className="ui-photo">
            <span className="ui-photo-avatar" style={preview ? { backgroundImage: `url("${preview}")` } : undefined}>{!preview && <UserRound size={30} />}</span>
            <form action={uploadAvatar} className="ui-photo-form">
              <label className="ui-btn ui-btn-secondary ui-btn-sm ui-file">
                <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" required onChange={selectAvatar} />
                <Camera size={15} />{fileName ? "Choose another" : "Choose photo"}
              </label>
              {fileName && <SubmitButton className="ui-btn ui-btn-primary ui-btn-sm"><ImagePlus size={15} /> Save photo</SubmitButton>}
            </form>
            {avatarUrl && !fileName && (
              <form action={removeAvatar}>
                <SubmitButton className="ui-btn ui-btn-ghost ui-btn-sm"><Trash2 size={15} /> Remove</SubmitButton>
              </form>
            )}
          </div>
          <p className="ui-small">{fileName || "JPG, PNG or WEBP, up to 2 MB."}</p>
          {fileError && <p role="alert" className="ui-notice ui-notice-danger">{fileError}</p>}
        </div>
      </section>

      <section className="ui-card ui-settings-card" aria-labelledby="identity-title">
        <div className="ui-settings-side">
          <h2 id="identity-title" className="ui-h3">Profile</h2>
          <p>Your name appears on passes and in the navigation. {organizer ? "You have organizer access." : ""}</p>
        </div>
        <form action={saveProfile} className="ui-formgrid">
          <label className="ui-field ui-span-2">
            <span>Display name</span>
            <input className="ui-input" name="fullName" required minLength={2} maxLength={60} defaultValue={fullName} autoComplete="name" placeholder="Your full name" />
          </label>
          <label className="ui-field">
            <span>Username</span>
            <span className="ui-affix ui-affix-start"><span>@</span><input name="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" autoComplete="username" defaultValue={username} placeholder="your_username" /></span>
            <small>3 to 24 letters, numbers or underscores.</small>
          </label>
          <label className="ui-field">
            <span>Email</span>
            <input className="ui-input" value={email} readOnly disabled />
            <small>Your sign-in email.</small>
          </label>
          <div className="ui-span-2 ui-formactions"><SubmitButton className="ui-btn ui-btn-primary">Save profile</SubmitButton></div>
        </form>
      </section>
    </div>
  );
}
