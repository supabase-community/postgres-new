create policy "Users can upload files to the s3fs bucket"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 's3fs' and
  (storage.foldername(name))[1] = 'dbs'
);