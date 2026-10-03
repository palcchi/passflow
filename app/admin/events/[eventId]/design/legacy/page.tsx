import { PublishFigmaButton } from "@/components/publish-figma-button";
import Link from "next/link";
import Image from "next/image";
import { Figma } from "lucide-react";
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
import { EventDesignFlow } from "@/components/event-design-flow";

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
        "id,kind,name,status,figma_file_url,figma_file_name,figma_version,preview_url,last_synced_at,template,ticket_type_id",
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
    <div className="event-admin-editor-page">
      <header className="event-admin-local-heading">
        <span className="section-kicker">PassFlow Design</span>
        <h2>Pass designs from Figma</h2>
        <p>
          Sync digital pass, ID card and wristband frames from Figma as drafts, then review and publish the selected version.
        </p>
      </header>

      
      <EventDesignFlow />

      {!connection ? (
          <section className="design-connect-card liquid-panel">
            <div className="design-connect-icon">
              <Figma size={25} />
            </div>
            <div>
              <span className="section-kicker">Figma account</span>
              <h2>Connect your Figma</h2>
              <p>
                PassFlow reads the layer names, dimensions, positions, and frame preview you
                authorize.
              </p>
            </div>
            <a
              className="button button-dark"
              href={`/api/figma/connect?next=${encodeURIComponent(
                `/admin/events/${eventId}/design/legacy`,
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
              <p>{connection.email ?? "A Figma account is connected."}</p>
            </div>
            <Link className="button button-ghost" href="/profile">
              Manage connection
            </Link>
          </section>
        )}
      

      {(error ||
        connectionError ||
        designsError ||
        (query.figma && query.figma !== "connected")) && (
        <p role="alert" className="design-alert">
          {error === "invalid_ticket_type"
            ? "The selected ticket category does not belong to this event."
            : "The Figma file could not be processed. Check the account connection and file permissions, then try again."}
        </p>
      )}
      {query.figma === "connected" && (
        <p role="status" className="design-success">
          Figma is connected. You can now sync design frames.
        </p>
      )}
      {query.synced && (
        <p role="status" className="design-success">
          Frame synced successfully. All detected markers have been saved.
        </p>
      )}

      
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
                        <span>Preview unavailable</span>
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
                            No recognized markers
                          </span>
                        )}
                      </div>
                      <div className="design-card-actions">
                        <a
                          href={`/admin/events/${eventId}/export/figma?designId=${design.id}`}
                          className="button button-ghost"
                        >
                          Save as
                        </a>
                        <a
                          href={design.figma_file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="button button-ghost"
                        >
                          Edit in Figma
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
                            Sync to new draft
                          </button>
                        </form>
                        <span className="soft-badge">{design.status}</span>
                        {design.status === "draft" && <PublishFigmaButton eventId={eventId} id={design.id}/>}
                        {design.status === "draft" && <DeleteDesignForm
                          eventId={eventId}
                          designId={design.id}
                          name={design.name}
                        />}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="design-empty-state">
              <Figma size={24} />
              <strong>No synced designs yet.</strong>
              <span>
                Add a Figma frame below. After syncing, its preview and markers will appear
                here.
              </span>
            </div>
          )}

          {connection && (
            <form action={syncFigmaDesign} className="design-form design-form-refined">
              <div className="design-form-section-label">
                <span className="section-kicker">Add design</span>
                <strong>Connect a new frame</strong>
              </div>

              <label>
                Asset type
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
                Design name
                <input name="name" required placeholder="VIP Credential" />
              </label>

              <label>
                For pass category
                <SmartSelect
                  name="ticketTypeId"
                  value=""
                  options={[
                    { value: "", label: "All categories" },
                    ...(tickets ?? []).map((ticket) => ({
                      value: ticket.id,
                      label: ticket.name,
                    })),
                  ]}
                />
                <small>Leave this unselected to apply the design to all attendees.</small>
              </label>

              <label className="design-form-url">
                Figma file atau frame URL
                <input
                  name="figmaUrl"
                  required
                  placeholder="Paste a Figma frame or selection link"
                />
                <small>
                  Select a frame in Figma, then copy its selection link. Sync reads every marker
                  di frame itu.
                </small>
              </label>

              <label>
                QR color
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
                      description: "Recommended for reliable scanning",
                    },
                    { value: "rounded", label: "Rounded" },
                    { value: "dots", label: "Dots" },
                  ]}
                />
              </label>

              <div className="design-form-url design-marker-note">
                <strong>Supported markers</strong>
                <p>{markerHelp}</p>
                <p>
                  The PassFlow Design plugin can insert these markers automatically. Layer names
                  must match exactly. Attendee data, optional photos, tickets, and QR codes are still sourced
                  dari PassFlow.
                </p>
              </div>

              <div className="design-form-submit">
                <button className="button button-dark" type="submit">
                  Sync design
                </button>
                <p>
                  Your original design remains unchanged. Save as creates a separate export and does not edit
                  file Figma.
                </p>
              </div>
            </form>
          )}
        </section>
      

      
        <section className="figma-howto liquid-panel">
          <strong>PassFlow Design workflow</strong>
          <span>
            Add markers in Figma → Sync → review detected markers → Save as to
            generate attendee output. Event page assets continue to use the registration and QR system
            milik PassFlow.
          </span>
        </section>
    </div>
  );
}
