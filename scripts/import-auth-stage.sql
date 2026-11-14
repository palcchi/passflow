BEGIN;
INSERT INTO auth.users (id,email,encrypted_password,email_confirmed_at,invited_at,confirmation_token,confirmation_sent_at,recovery_token,recovery_sent_at,email_change_token_new,email_change,last_sign_in_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,created_at,updated_at)
SELECT id,email,encrypted_password,email_confirmed_at,invited_at,confirmation_token,confirmation_sent_at,recovery_token,recovery_sent_at,email_change_token_new,email_change,last_sign_in_at,COALESCE(raw_app_meta_data,'{}'::jsonb),COALESCE(raw_user_meta_data,'{}'::jsonb),is_super_admin,created_at,updated_at
FROM supabase_import.users
ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,encrypted_password=EXCLUDED.encrypted_password,email_confirmed_at=EXCLUDED.email_confirmed_at,raw_app_meta_data=EXCLUDED.raw_app_meta_data,raw_user_meta_data=EXCLUDED.raw_user_meta_data,updated_at=EXCLUDED.updated_at;
INSERT INTO auth.identities (id,user_id,provider,provider_subject,provider_email,created_at,updated_at)
SELECT id,user_id,provider,COALESCE(NULLIF(provider_id,''),id::text),COALESCE(email,identity_data->>'email'),COALESCE(created_at,now()),COALESCE(updated_at,now())
FROM supabase_import.identities
ON CONFLICT (id) DO UPDATE SET provider_subject=EXCLUDED.provider_subject,provider_email=EXCLUDED.provider_email,updated_at=EXCLUDED.updated_at;
COMMIT;
