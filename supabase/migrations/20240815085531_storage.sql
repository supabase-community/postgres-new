create policy "Users can only see their own files."
on storage.objects
for select to authenticated
using (owner_id = auth.uid()::text);

create policy "Users can only upload files to the s3fs/dbs folder."
on storage.objects
for insert to authenticated
with check (
  bucket_id = 's3fs' and
  (storage.foldername(name))[1] = 'dbs'
);

create policy "Users can only update their own files."
on storage.objects
for update to authenticated
using (owner_id = auth.uid()::text)
with check (owner_id = auth.uid()::text);

create policy "Users can only delete their own files."
on storage.objects
for delete to authenticated
using (owner_id = auth.uid()::text);
