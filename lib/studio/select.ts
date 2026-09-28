import { readStudioDocument } from './model';
export function selectStudioDesign<T extends { kind: string; ticket_type_id: string | null; document: unknown }>(designs: T[], kinds: string[], ticketTypeId: string | null | undefined) {
  for (const kind of kinds) {
    const match = (ticketTypeId ? designs.find(d => d.kind === kind && d.ticket_type_id === ticketTypeId) : undefined) ?? designs.find(d => d.kind === kind && d.ticket_type_id === null);
    const document = match ? readStudioDocument(match.document) : null;
    if(document) return document;
  }
  return null;
}
