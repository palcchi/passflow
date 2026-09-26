import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink, Figma, RefreshCw } from "lucide-react";
import { designKinds, defaultTemplate, dynamicMarkers, readTemplate } from "@/lib/design-template";
import { notFound } from "next/navigation";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { getManagedEvent } from "@/lib/events";
import { syncFigmaDesign } from "@/app/admin/actions";
import { DeleteDesignForm } from "@/components/delete-design-form";

const markerHelp = Object.keys(dynamicMarkers).join(" · ");

export default async function EventDesignPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();
  const { supabase, user } = await requireOrganizerMembership(`/admin/events/${eventId}/design`);
  const [{ data: connection, error: connectionError }, { data: designs, error: designsError }, { data: tickets }] = await Promise.all([
    supabase.from("figma_connections").select("handle,email,updated_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("event_designs").select("id,kind,name,figma_file_url,figma_file_name,figma_version,preview_url,last_synced_at,template,ticket_type_id").eq("event_id", eventId).order("updated_at", { ascending: false }),
    supabase.from("ticket_types").select("id,name").eq("event_id", eventId).order("created_at"),
  ]);
  const error = typeof query.error === "string" ? query.error : null;
  return <main className="editor-page">
    <header className="editor-header"><div><Link href={`/admin/events/${eventId}`} className="back-link"><ArrowLeft size={16}/> Kembali ke event</Link><span className="section-kicker">PassFlow Design</span><h1>Design {event.name}</h1><p>Sinkronkan frame Figma, hubungkan elemen dinamis, dan ekspor pass per peserta tanpa mengubah file aslimu.</p></div><Link href={`/e/${event.slug}`} className="button button-dark"><ExternalLink size={16}/> Public page</Link></header>
    {!connection ? <section className="design-connect-card"><div className="design-connect-icon"><Figma size={25}/></div><div><span className="section-kicker">Figma account</span><h2>Connect your Figma</h2><p>PassFlow membaca nama layer, ukuran, posisi, dan preview frame yang kamu izinkan.</p></div><a className="button button-dark" href={`/api/figma/connect?next=${encodeURIComponent(`/admin/events/${eventId}/design`)}`}>Connect Figma</a></section> : <section className="design-connect-card is-connected"><div className="design-connect-icon"><Figma size={25}/></div><div><span className="section-kicker">Connected</span><h2>{connection.handle ?? connection.email ?? "Figma account"}</h2><p>{connection.email ?? "Akun Figma terhubung ke akun ini."}</p></div><Link className="button button-ghost" href="/profile">Kelola koneksi</Link></section>}
    {(error || connectionError || designsError || (query.figma && query.figma !== "connected")) && <p role="alert" className="design-alert">{error === "invalid_ticket_type" ? "Kategori tiket tidak cocok dengan event ini." : "Figma belum berhasil diproses. Periksa koneksi akun dan akses file, lalu coba lagi."}</p>}
    {query.figma === "connected" && <p role="status" className="design-success">Akun Figma terhubung. Sekarang kamu bisa menyinkronkan desain.</p>}
    {query.synced && <p role="status" className="design-success">Frame disinkronkan; semua marker yang ditemukan sudah tersimpan.</p>}
    <section className="design-workspace">
      <div className="section-heading"><div><span className="section-kicker">Event assets</span><h2>Design library</h2></div><span className="soft-badge">{designs?.length ?? 0} assets</span></div>
      <div className="design-grid">{(designs ?? []).map((design) => {
        const template = readTemplate(design.template);
        const markerNames = [...new Set(template.elements.map((element) => element.marker))];
        return <article className="design-card" key={design.id}>
          {design.preview_url ? <Image src={design.preview_url} alt={`Preview ${design.name}`} width={900} height={600} unoptimized className="design-preview-image" /> : <div className="design-preview-empty"><Figma size={26}/><span>Preview belum tersedia</span></div>}
          <div className="design-card-body"><span className="section-kicker">{designKinds.find((item) => item.value === design.kind)?.label ?? design.kind}</span><h3>{design.name}</h3>
            <p>{design.figma_file_name ?? "Figma file"}{design.figma_version ? ` · ${design.figma_version.slice(0, 8)}` : ""}</p>
            <p className="text-xs text-muted-foreground">Frame {template.frame.width} × {template.frame.height}px · {template.elements.length} dynamic elements</p>
            <div className="flex flex-wrap gap-1">{markerNames.length ? markerNames.map((marker) => <span className="soft-badge" key={marker}>{marker.replace("PASSFLOW_", "")}</span>) : <span className="text-xs text-muted-foreground">Belum ada marker yang dikenali</span>}</div>
            <div className="design-card-actions">
              <a href={`/admin/events/${eventId}/export/figma?designId=${design.id}`} className="button button-ghost"><ExternalLink size={14}/> Save as</a>
              <a href={design.figma_file_url} target="_blank" rel="noreferrer" className="button button-ghost"><ExternalLink size={14}/> Edit in Figma</a>
              <form action={syncFigmaDesign}><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="designId" value={design.id}/><input type="hidden" name="assetType" value={design.kind}/><input type="hidden" name="name" value={design.name}/><input type="hidden" name="figmaUrl" value={design.figma_file_url}/><input type="hidden" name="ticketTypeId" value={design.ticket_type_id ?? ""}/><input type="hidden" name="qrForeground" value={template.qrStyle.foreground}/><input type="hidden" name="qrBackground" value={template.qrStyle.background}/><input type="hidden" name="qrModules" value={template.qrStyle.modules}/><button className="button button-ghost" type="submit"><RefreshCw size={14}/> Sync</button></form>
              <DeleteDesignForm eventId={eventId} designId={design.id} name={design.name}/>
            </div>
          </div>
        </article>;
      })}</div>
      {connection && <form action={syncFigmaDesign} className="design-form">
        <input type="hidden" name="eventId" value={eventId}/>
        <label>Jenis asset<select name="assetType" defaultValue="id_card">{designKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Nama desain<input name="name" required placeholder="VIP ID Card" /></label>
        <label>Untuk kategori tiket<select name="ticketTypeId" defaultValue=""><option value="">Semua kategori</option>{(tickets ?? []).map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.name}</option>)}</select><small>Kosongkan jika desain ini berlaku untuk semua attendee.</small></label>
        <label className="design-form-url">Figma file atau frame URL<input name="figmaUrl" required placeholder="https://www.figma.com/design/...node-id=..." /><small>Pilih frame di Figma lalu salin link selection; Sync membaca semua marker di frame itu.</small></label>
        <label>Warna QR<input type="color" name="qrForeground" defaultValue={defaultTemplate.qrStyle.foreground}/></label>
        <label>Latar QR<input type="color" name="qrBackground" defaultValue={defaultTemplate.qrStyle.background}/></label>
        <label>Bentuk modul<select name="qrModules" defaultValue="square"><option value="square">Kotak · paling andal</option><option value="rounded">Rounded</option><option value="dots">Dots</option></select></label>
        <div className="design-form-url"><strong>Marker yang didukung</strong><p className="text-xs text-muted-foreground">{markerHelp}</p><p className="text-xs text-muted-foreground">Plugin PassFlow Design bisa menyisipkan marker ini otomatis. Nama layer harus sama persis; semua data peserta, foto opsional, tiket, dan QR diambil dari PassFlow. Pastikan warna QR/latar punya kontras kuat agar tetap mudah dipindai.</p></div>
        <button className="button button-dark" type="submit"><RefreshCw size={16}/> Sync design</button>
        <p className="text-xs text-muted-foreground">Desain asli tetap aman. “Save as” membuat ekspor terpisah dan tidak mengedit file Figma.</p>
      </form>}
    </section>
    <section className="figma-howto"><strong>PassFlow Design workflow</strong><span>Tambahkan marker di Figma → Sync → cek marker yang ditemukan → “Save as” untuk membuat hasil peserta. Asset halaman event memakai tombol daftar PassFlow yang tetap aktif dan dapat diakses.</span></section>
  </main>;
}
