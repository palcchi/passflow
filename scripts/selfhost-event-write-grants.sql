-- Additive grants required by organizer event-management actions on standalone PostgREST.
-- Row-level security policies remain authoritative; these grants do not bypass them.
GRANT SELECT, UPDATE ON TABLE public.figma_plugin_links TO authenticated;
GRANT INSERT ON TABLE public.event_invitations TO authenticated;
GRANT UPDATE ON TABLE public.event_members TO authenticated;
GRANT UPDATE ON TABLE public.qr_credentials TO authenticated;
GRANT INSERT ON TABLE public.organizer_applications TO authenticated;
