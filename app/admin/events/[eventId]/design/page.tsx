export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Figma,
  Link2,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { getManagedEvent } from "@/lib/events";
import { getFigmaConfig } from "@/lib/figma";
import { requireOrganizerMembership } from "@/lib/auth/session";
import {
  attachFigmaDesign,
  disconnectFigma,
  removeFigmaDesign,
  syncFigmaDesign,
} from "./actions";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const assetKinds = [
  { kind: "id_card", label: "ID Card", hint: "Badge peserta, crew, VIP, dan akses." },
  { kind: "lanyard", label: "Lanyard", hint: "Artwork tali lanyard untuk produksi." },
  { kind: "wristband", label: "Wristband", hint: "Layout gelang dan area QR." },
  { kind: "ticket", label: "Ticket", hint: "Tiket digital atau printable." },
  { kind: "event_cover", label: "Event Cover", hint: "Hero, poster, dan cover utama event." },
  { kind: "event_page", label: "Event Page", hint: "Referensi visual untuk tampilan halaman event." },
] as const;

const statusCopy: Record<string, string> = {
  connected: "Akun Figma berhasil terhubung.",
  error: "Koneksi Figma gagal. Coba hubungkan ulang.",
  not_configured: "PassFlow Design belum memiliki kredensial OAuth Figma di server.",
  invalid_state: "Sesi koneksi Figma kedaluwarsa. Mulai koneksi ulang.",
};

const designCopy: Record<string, string> = {
  linked: "Desain berhasil ditautkan ke event.",
  synced: "Preview desain berhasil disinkronkan dari Figma.",
  removed: "Desain dilepas dari event.",
  disconnected: "Akun Figma dilepas dari PassFlow.",
  figma_error: "PassFlow tidak dapat membaca file Figma itu. Pastikan akunmu punya akses.",
  invalid: "Link Figma atau tipe desain tidak valid.",
  missing: "Desain tidak ditemukan.",
};

export default async function PassFlowDesignPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase, user } = await requireOrganizerMembership(
    "/admin/events/" + eventId + "/design",
  );

  const [{ data: connection }, { data: designs }] = await Promise.all([
    supabase
      .from("figma_connections")
      .select("figma_user_id, handle, email, avatar_url, connected_at, expires_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("event_designs")
      .select(
        "id, kind, name, figma_file_url, figma_file_name, figma_node_id, figma_version, preview_url, last_synced_at",
      )
      .eq("event_id", eventId)
      .order("created_at"),
  ]);

  const byKind = new Map((designs ?? []).map((design) => [design.kind, design]));
  const figmaStatus = typeof query.figma === "string" ? query.figma : "";
  const designStatus = typeof query.design === "string" ? query.design : "";
  const configured = Boolean(getFigmaConfig());

  return (
    <main className="min-h-screen bg-background px-4 py-7 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href={"/admin/events/" + event.id} className="back-link">
              <ArrowLeft size={16} /> Manage event
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="section-kicker">PassFlow Design</span>
              <span className="soft-badge">{event.name}</span>
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Design once. Keep it connected.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Figma tetap menjadi editor visual milik organizer. PassFlow menghubungkan file,
              frame, preview, dan asset event ke sistem yang sama.
            </p>
          </div>

          {connection ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className="grid size-9 place-items-center rounded-full bg-[#f2c94c] text-sm font-semibold text-black">
                {(connection.handle ?? connection.email ?? "F").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Figma size={15} /> {connection.handle ?? "Figma connected"}
                </div>
                <p className="max-w-48 truncate text-xs text-muted-foreground">
                  {connection.email ?? connection.figma_user_id}
                </p>
              </div>
              <form action={disconnectFigma}>
                <input type="hidden" name="eventId" value={event.id} />
                <button className="button button-ghost button-small" type="submit">
                  Disconnect
                </button>
              </form>
            </div>
          ) : (
            <Link
              className="button button-dark"
              href={"/api/figma/connect?eventId=" + event.id}
              aria-disabled={!configured}
            >
              <Figma size={16} /> Connect Figma
            </Link>
          )}
        </header>

        {(statusCopy[figmaStatus] || designCopy[designStatus]) && (
          <div className="mt-6 rounded-lg border border-border bg-muted px-4 py-3 text-sm">
            {statusCopy[figmaStatus] ?? designCopy[designStatus]}
          </div>
        )}

        {!configured && (
          <div className="mt-6 rounded-lg border border-[#ead88f] bg-[#fff9df] p-4 text-sm text-[#5d4a00]">
            <strong>OAuth Figma belum dikonfigurasi.</strong>
            <p className="mt-1">
              Server membutuhkan FIGMA_CLIENT_ID, FIGMA_CLIENT_SECRET, dan
              FIGMA_TOKEN_ENCRYPTION_KEY. UI dan database sudah siap, tetapi login Figma baru
              aktif setelah tiga secret itu tersedia.
            </p>
          </div>
        )}

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-muted">
                <Figma size={19} />
              </div>
              <div>
                <span className="section-kicker">Connected workflow</span>
                <h2 className="mt-1 text-2xl font-semibold">Figma is the visual editor</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["01", "Connect", "Organizer login memakai akun Figma mereka sendiri."],
                ["02", "Design", "Edit frame dan visual bebas langsung di Figma."],
                ["03", "Sync", "PassFlow mengambil preview dan mengikatnya ke asset event."],
              ].map(([step, title, body]) => (
                <div key={step} className="rounded-lg bg-muted p-4">
                  <span className="text-xs font-semibold text-muted-foreground">{step}</span>
                  <strong className="mt-5 block">{title}</strong>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-xl border border-border bg-[#181818] p-5 text-white sm:p-7">
            <ShieldCheck size={20} />
            <h2 className="mt-5 text-xl font-semibold">Data stays in PassFlow</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Attendee, QR, access rules, dan event lifecycle tetap berasal dari database
              PassFlow. Figma hanya menjadi workspace desain organizer.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["attendee.name", "attendee.role", "attendee.qr", "event.name"].map((token) => (
                <span key={token} className="rounded-md border border-white/15 px-2 py-1 font-mono text-[11px] text-white/75">
                  {"{{" + token + "}}"}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-white/45">
              Token data ini disiapkan untuk plugin PassFlow Design berikutnya agar isi frame
              bisa digenerate dari attendee tanpa membuat ribuan frame manual.
            </p>
          </aside>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="section-kicker">Design library</span>
              <h2 className="mt-2 text-2xl font-semibold">Assets for this event</h2>
            </div>
            <span className="soft-badge">{designs?.length ?? 0} connected</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assetKinds.map((asset) => {
              const design = byKind.get(asset.kind);
              return (
                <article key={asset.kind} className="overflow-hidden rounded-xl border border-border bg-card">
                  <div
                    className="aspect-[16/9] border-b border-border bg-muted bg-cover bg-center"
                    style={
                      design?.preview_url
                        ? { backgroundImage: "url(\"" + design.preview_url + "\")" }
                        : undefined
                    }
                  >
                    {!design?.preview_url && (
                      <div className="grid h-full place-items-center text-muted-foreground">
                        <div className="text-center">
                          <Figma className="mx-auto" size={26} />
                          <p className="mt-2 text-xs">No synced preview</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{asset.label}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{asset.hint}</p>
                      </div>
                      <span className="soft-badge">{design ? "Linked" : "Empty"}</span>
                    </div>

                    {design ? (
                      <>
                        <div className="mt-5 rounded-lg bg-muted p-3">
                          <strong className="block truncate text-sm">
                            {design.name || design.figma_file_name || asset.label}
                          </strong>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {design.figma_file_name ?? "Figma file"}
                            {design.figma_node_id ? " · frame " + design.figma_node_id : ""}
                          </p>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {design.last_synced_at
                              ? "Synced " + new Intl.DateTimeFormat("id-ID", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                  timeZone: "Asia/Jakarta",
                                }).format(new Date(design.last_synced_at))
                              : "Not synced yet"}
                          </p>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <a
                            className="button button-dark button-small"
                            href={design.figma_file_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink size={14} /> Edit in Figma
                          </a>
                          <form action={syncFigmaDesign}>
                            <input type="hidden" name="eventId" value={event.id} />
                            <input type="hidden" name="designId" value={design.id} />
                            <button className="button button-ghost button-small" type="submit">
                              <RefreshCw size={14} /> Sync
                            </button>
                          </form>
                          <form action={removeFigmaDesign}>
                            <input type="hidden" name="eventId" value={event.id} />
                            <input type="hidden" name="designId" value={design.id} />
                            <button className="button button-ghost button-small" type="submit" aria-label={"Remove " + asset.label}>
                              <Trash2 size={14} />
                            </button>
                          </form>
                        </div>
                      </>
                    ) : (
                      <form action={attachFigmaDesign} className="mt-5 space-y-3">
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="kind" value={asset.kind} />
                        <input
                          className="min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          name="name"
                          placeholder={asset.label + " · " + event.name}
                        />
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                            <input
                              className="min-h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                              name="figmaUrl"
                              type="url"
                              placeholder="Paste Figma frame URL"
                              required
                              disabled={!connection}
                            />
                          </div>
                          <button className="button button-dark button-small" type="submit" disabled={!connection}>
                            Link
                          </button>
                        </div>
                        {!connection && (
                          <p className="text-xs text-muted-foreground">
                            Connect akun Figma terlebih dahulu untuk menautkan file.
                          </p>
                        )}
                      </form>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
