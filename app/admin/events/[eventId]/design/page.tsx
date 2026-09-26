import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ExternalLink,
  Figma,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  designKinds,
  defaultTemplate,
  dynamicMarkers,
  readTemplate,
} from "@/lib/design-template";
import { notFound } from "next/navigation";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { getManagedEvent } from "@/lib/events";
import { syncFigmaDesign } from "@/app/admin/actions";
import { DeleteDesignForm } from "@/components/delete-design-form";
import { SmartSelect } from "@/components/form-fields";
import { BlurFade } from "@/components/magicui/blur-fade";

const markerHelp = Object.keys(dynamicMarkers).join(" · ");

export default async function EventDesignPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase, user } = await requireOrganizerMembership(
    `/admin/events/${eventId}/design`,
  );

  const [
    { data: connection, error: connectionError },
    { data: designs, error: designsError },
    { data: tickets },
  ] = await Promise.all([
    supabase
      .from("figma_connections")
      .select("handle,email,updated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("event_designs")
      .select(
        "id,kind,name,figma_file_url,figma_file_name,figma_version,preview_url,last_synced_at,template,ticket_type_id",
      )
      .eq("event_id", eventId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("ticket_types")
      .select("id,name")
      .eq("event_id", eventId)
      .order("created_at"),
  ]);

  const error = typeof query.error === "string" ? query.error : null;

  return (
    <main className="editor-page">
      <BlurFade>
        <header className="editor-header design-editor-header">
          <div>
            <Link href={`/admin/events/${eventId}`} className="back-link">
              <ArrowLeft size={16} /> Kembali ke event
            </Link>
            <span className="dashboard-welcome-kicker design-page-kicker">
              <Sparkles size={13} /> PassFlow Design
            </span>
            <h1>Design {event.name}</h1>
            <p>
              Sinkronkan frame Figma, hubungkan elemen dinamis, dan ekspor pass per peserta
              tanpa mengubah file aslimu.
            </p>
          </div>
          <div className="editor-header-actions">
            <Link
              href={`/admin/events/${eventId}/appearance`}
              className="button button-ghost"
            >
              Customize
            </Link>
            <Link href={`/e/${event.slug}`} className="button button-dark">
              <ExternalLink size={16} /> Public page
            </Link>
          </div>
        </header>
      </BlurFade>

      <BlurFade delay={0.04}>
        {!connection ? (
          <section className="design-connect-card liquid-panel">
            <div className="design-connect-icon">
              <Figma size={25} />
            </div>
            <div>
              <span className="section-kicker">Figma account</span>
              <h2>Connect your Figma</h2>
              <p>
                PassFlow membaca nama layer, ukuran, posisi, dan preview frame yang kamu
                izinkan.
              </p>
            </div>
            <a
              className="button button-dark"
              href={`/api/figma/connect?next=${encodeURIComponent(
                `/admin/events/${eventId}/design`,
              )}`}
            >
              Connect Figma
            </a>
          </section>
        ) : (
          <section className="design-connect-card liquid-panel is-connected">
            <div className="design-connect-icon">
              <Figma size={25} />
            </div>
            <div>
              <span className="section-kicker">Connected</span>
              <h2>{connection.handle ?? connection.email ?? "Figma account"}</h2>
              <p>{connection.email ?? "Akun Figma terhubung ke akun ini."}</p>
            </div>
            <Link className="button button-ghost" href="/profile">
              Kelola koneksi
            </Link>
          </section>
        )}
      </BlurFade>

      {(error ||
        connectionError ||
        designsError ||
        (query.figma && query.figma !== "connected")) && (
        <p role="alert" className="design-alert">
          {error === "invalid_ticket_type"
            ? "Kategori tiket tidak cocok dengan event ini."
            : "Figma belum berhasil diproses. Periksa koneksi akun dan akses file, lalu coba lagi."}
        </p>
      )}
      {query.figma === "connected" && (
        <p role="status" className="design-success">
          Akun Figma terhubung. Sekarang kamu bisa menyinkronkan desain.
        </p>
      )}
      {query.synced && (
        <p role="status" className="design-success">
          Frame disinkronkan. Semua marker yang ditemukan sudah tersimpan.
        </p>
      )}

      <BlurFade delay={0.07}>
        <section className="design-workspace liquid-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Event assets</span>
              <h2>Design library</h2>
            </div>
            <span className="soft-badge">{designs?.length ?? 0} assets</span>
          </div>

          {(designs ?? []).length > 0 ? (
            <div className="design-grid">
              {(designs ?? []).map((design) => {
                const template = readTemplate(design.template);
                const markerNames = [
                  ...new Set(template.elements.map((element) => element.marker)),
                ];
                return (
                  <article className="design-card" key={design.id}>
                    {design.preview_url ? (
                      <Image
                        src={design.preview_url}
                        alt={`Preview ${design.name}`}
                        width={900}
                        height={600}
                        unoptimized
                        className="design-preview-image"
                      />
                    ) : (
                      <div className="design-preview-empty">
                        <Figma size={26} />
                        <span>Preview belum tersedia</span>
                      </div>
                    )}
                    <div className="design-card-body">
                      <span className="section-kicker">
                        {designKinds.find((item) => item.value === design.kind)?.label ??
                          design.kind}
                      </span>
                      <h3>{design.name}</h3>
                      <p>
                        {design.figma_file_name ?? "Figma file"}
                        {design.figma_version
                          ? ` · ${design.figma_version.slice(0, 8)}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Frame {template.frame.width} × {template.frame.height}px ·{" "}
                        {template.elements.length} dynamic elements
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {markerNames.length ? (
                          markerNames.map((marker) => (
                            <span className="soft-badge" key={marker}>
                              {marker.replace("PASSFLOW_", "")}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Belum ada marker yang dikenali
                          </span>
                        )}
                      </div>
                      <div className="design-card-actions">
                        <a
                          href={`/admin/events/${eventId}/export/figma?designId=${design.id}`}
                          className="button button-ghost"
                        >
                          <ExternalLink size={14} /> Save as
                        </a>
                        <a
                          href={design.figma_file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="button button-ghost"
                        >
                          <ExternalLink size={14} /> Edit in Figma
                        </a>
                        <form action={syncFigmaDesign}>
                          <input type="hidden" name="eventId" value={eventId} />
                          <input type="hidden" name="designId" value={design.id} />
                          <input type="hidden" name="assetType" value={design.kind} />
                          <input type="hidden" name="name" value={design.name} />
                          <input
                            type="hidden"
                            name="figmaUrl"
                            value={design.figma_file_url}
                          />
                          <input
                            type="hidden"
                            name="ticketTypeId"
                            value={design.ticket_type_id ?? ""}
                          />
                          <input
                            type="hidden"
                            name="qrForeground"
                            value={template.qrStyle.foreground}
                          />
                          <input
                            type="hidden"
                            name="qrBackground"
                            value={template.qrStyle.background}
                          />
                          <input
                            type="hidden"
                            name="qrModules"
                            value={template.qrStyle.modules}
                          />
                          <button className="button button-ghost" type="submit">
                            <RefreshCw size={14} /> Sync
                          </button>
                        </form>
                        <DeleteDesignForm
                          eventId={eventId}
                          designId={design.id}
                          name={design.name}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="design-empty-state">
              <Figma size={24} />
              <strong>Belum ada desain tersinkron.</strong>
              <span>
                Tambahkan frame Figma di bawah. Setelah sync, preview dan marker akan muncul
                di sini.
              </span>
            </div>
          )}

          {connection && (
            <form action={syncFigmaDesign} className="design-form design-form-refined">
              <div className="design-form-section-label">
                <span className="section-kicker">Add design</span>
                <strong>Hubungkan frame baru</strong>
              </div>

              <label>
                Jenis asset
                <SmartSelect
                  name="assetType"
                  value="id_card"
                  options={designKinds.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                />
              </label>

              <label>
                Nama desain
                <input name="name" required placeholder="VIP ID Card" />
              </label>

              <label>
                Untuk kategori tiket
                <SmartSelect
                  name="ticketTypeId"
                  value=""
                  options={[
                    { value: "", label: "Semua kategori" },
                    ...(tickets ?? []).map((ticket) => ({
                      value: ticket.id,
                      label: ticket.name,
                    })),
                  ]}
                />
                <small>Kosongkan jika desain berlaku untuk semua attendee.</small>
              </label>

              <label className="design-form-url">
                Figma file atau frame URL
                <input
                  name="figmaUrl"
                  required
                  placeholder="https://www.figma.com/design/...node-id=..."
                />
                <small>
                  Pilih frame di Figma lalu salin link selection. Sync membaca semua marker
                  di frame itu.
                </small>
              </label>

              <label>
                Warna QR
                <span className="design-color-input">
                  <input
                    type="color"
                    name="qrForeground"
                    defaultValue={defaultTemplate.qrStyle.foreground}
                  />
                  <small>Foreground</small>
                </span>
              </label>

              <label>
                Latar QR
                <span className="design-color-input">
                  <input
                    type="color"
                    name="qrBackground"
                    defaultValue={defaultTemplate.qrStyle.background}
                  />
                  <small>Background</small>
                </span>
              </label>

              <label>
                Bentuk modul
                <SmartSelect
                  name="qrModules"
                  value="square"
                  options={[
                    {
                      value: "square",
                      label: "Kotak",
                      description: "Paling andal untuk scanning",
                    },
                    { value: "rounded", label: "Rounded" },
                    { value: "dots", label: "Dots" },
                  ]}
                />
              </label>

              <div className="design-form-url design-marker-note">
                <strong>Marker yang didukung</strong>
                <p>{markerHelp}</p>
                <p>
                  Plugin PassFlow Design bisa menyisipkan marker ini otomatis. Nama layer
                  harus sama persis. Data peserta, foto opsional, tiket, dan QR tetap diambil
                  dari PassFlow.
                </p>
              </div>

              <div className="design-form-submit">
                <button className="button button-dark" type="submit">
                  <RefreshCw size={16} /> Sync design
                </button>
                <p>
                  Desain asli tetap aman. Save as membuat ekspor terpisah dan tidak mengedit
                  file Figma.
                </p>
              </div>
            </form>
          )}
        </section>
      </BlurFade>

      <BlurFade delay={0.1}>
        <section className="figma-howto liquid-panel">
          <strong>PassFlow Design workflow</strong>
          <span>
            Tambahkan marker di Figma → Sync → cek marker yang ditemukan → Save as untuk
            membuat hasil peserta. Asset halaman event tetap memakai sistem registrasi dan QR
            milik PassFlow.
          </span>
        </section>
      </BlurFade>
    </main>
  );
}
