'use server';

import { revalidatePath } from 'next/cache';
import { requireOrganizer } from '@/lib/auth/session';
import { postgresQuery } from '@/lib/db/postgres';
import { normalizeEventLabel, validEventLabel } from '@/lib/event-host';

type AccessRow = { allowed: boolean };
type AvailabilityRow = { available: boolean };

export async function checkNewEventSubdomain(raw: string) {
  const label = normalizeEventLabel(raw);
  if (!validEventLabel(label)) return { error: 'Use 3–63 lowercase letters, numbers or hyphens. System names are reserved.' };
  try {
    await requireOrganizer();
    const availability = await postgresQuery<AvailabilityRow>(
      `SELECT NOT EXISTS (SELECT 1 FROM public.event_subdomains WHERE label = $1) AS available`,
      [label],
    );
    return availability.rows[0]?.available
      ? { success: true, label }
      : { error: 'This subdomain is already reserved. Try another.' };
  } catch {
    return { error: 'Could not check availability right now. Try again.' };
  }
}

export async function eventSubdomain(eventId: string, raw: string, save = false) {
  const label = normalizeEventLabel(raw);
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(eventId) || !validEventLabel(label)) {
    return { error: 'Use 3 to 63 lowercase letters, numbers or hyphens. System names are reserved.' };
  }

  let context;
  try {
    context = await requireOrganizer();
  } catch {
    return { error: 'Please sign in with an authorized organizer account.' };
  }

  // Verify ownership against local PostgreSQL. Do not trust a client-provided event ID.
  const access = await postgresQuery<AccessRow>(
    `SELECT EXISTS (
       SELECT 1
       FROM public.events e
       JOIN public.organization_members m ON m.organization_id = e.organization_id
       WHERE e.id = $1 AND m.user_id = $2 AND m.role IN ('owner', 'admin')
     ) AS allowed`,
    [eventId, context.user.id],
  );
  if (!access.rows[0]?.allowed) return { error: 'You do not have permission to manage this event.' };

  if (!save) {
    const availability = await postgresQuery<AvailabilityRow>(
      `SELECT NOT EXISTS (
         SELECT 1 FROM public.event_subdomains
         WHERE label = $1 AND event_id <> $2
       ) AS available`,
      [label, eventId],
    );
    return availability.rows[0]?.available
      ? { success: true, label }
      : { error: 'This address is already reserved.' };
  }

  try {
    const result = await postgresQuery(
      `INSERT INTO public.event_subdomains (event_id, label)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO UPDATE
         SET label = EXCLUDED.label, updated_at = now()
       RETURNING event_id`,
      [eventId, label],
    );
    if (result.rowCount !== 1) return { error: 'Address could not be saved.' };
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
    return { error: code === '23505'
      ? 'This address was just reserved. Choose another.'
      : 'Address could not be saved. Check local database configuration.' };
  }

  revalidatePath(`/organizer/events/${eventId}/design`);
  return { success: true, label };
}
