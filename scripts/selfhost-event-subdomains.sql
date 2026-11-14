-- Self-hosted event subdomains for the local PostgreSQL database.
-- This migration intentionally creates an empty mapping table; it does not import old data.
CREATE TABLE IF NOT EXISTS public.event_subdomains (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  label text NOT NULL UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_subdomains_label_valid CHECK (
    length(label) BETWEEN 3 AND 63
    AND label ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
    AND label NOT LIKE 'xn--%'
    AND label <> ALL (ARRAY[
      'www','admin','api','app','login','auth','support','mail','smtp','imap','pop',
      'static','assets','cdn','status','help','docs','blog','dev','test','staging',
      'preview','vercel','dashboard','account','accounts','register','billing',
      'security','webhooks','figma','passflow','ns1','ns2'
    ])
  )
);
CREATE INDEX IF NOT EXISTS event_subdomains_label_idx ON public.event_subdomains(label);
