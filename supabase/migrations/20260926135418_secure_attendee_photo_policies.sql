drop policy if exists attendee_profiles_insert_owner on public.attendee_profiles;
create policy attendee_profiles_insert_owner on public.attendee_profiles
  for insert to authenticated with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.attendees a
      where a.id = attendee_profiles.attendee_id
        and a.event_id = attendee_profiles.event_id
        and a.user_id = (select auth.uid())
    ) and (photo_storage_path is null or (
      (storage.foldername(photo_storage_path))[1] = (select auth.uid())::text
      and (storage.foldername(photo_storage_path))[2] = attendee_profiles.event_id::text
    ))
  );

drop policy if exists attendee_profiles_update_owner on public.attendee_profiles;
create policy attendee_profiles_update_owner on public.attendee_profiles
  for update to authenticated using (
    user_id = (select auth.uid())
  ) with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.attendees a
      where a.id = attendee_profiles.attendee_id
        and a.event_id = attendee_profiles.event_id
        and a.user_id = (select auth.uid())
    ) and (photo_storage_path is null or (
      (storage.foldername(photo_storage_path))[1] = (select auth.uid())::text
      and (storage.foldername(photo_storage_path))[2] = attendee_profiles.event_id::text
    ))
  );

drop policy if exists attendee_profiles_select_owner_or_manager on public.attendee_profiles;
drop policy if exists attendee_profiles_read_owner_or_manager on public.attendee_profiles;
create policy attendee_profiles_read_owner_or_manager on public.attendee_profiles
  for select to authenticated using (
    user_id = (select auth.uid()) or public.is_event_manager(event_id)
  );

drop policy if exists attendee_photos_insert_owner on storage.objects;
drop policy if exists attendee_photos_insert_own on storage.objects;
create policy attendee_photos_insert_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'attendee-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists attendee_photos_update_owner on storage.objects;
drop policy if exists attendee_photos_update_own on storage.objects;
create policy attendee_photos_update_own on storage.objects
  for update to authenticated using (
    bucket_id = 'attendee-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  ) with check (
    bucket_id = 'attendee-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists attendee_photos_delete_owner on storage.objects;
drop policy if exists attendee_photos_delete_own on storage.objects;
create policy attendee_photos_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'attendee-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists attendee_photos_read_owner_or_manager on storage.objects;
drop policy if exists attendee_photos_read_own_or_manager on storage.objects;
create policy attendee_photos_read_own_or_manager on storage.objects
  for select to authenticated using (
    bucket_id = 'attendee-photos' and exists (
      select 1 from public.attendee_profiles p
      where p.photo_storage_path = name and (p.user_id = (select auth.uid()) or public.is_event_manager(p.event_id))
    )
  );
