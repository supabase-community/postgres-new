export const env = {
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? 'minioadmin',
  AWS_ENDPOINT_URL_S3: process.env.AWS_ENDPOINT_URL_S3 ?? 'http://minio:9000',
  AWS_REGION: process.env.AWS_REGION ?? 'us-east-1',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? 'minioadmin',
  BUCKET_NAME: process.env.BUCKET_NAME ?? 'test',
  CACHE_DISK_USAGE_THRESHOLD: parseInt(process.env.CACHE_DISK_USAGE_THRESHOLD ?? '90'),
  CACHE_PATH: process.env.CACHE_PATH ?? './dbs',
  CACHE_SCHEDULE_INTERVAL: parseInt(process.env.CACHE_SCHEDULE_INTERVAL ?? '1'),
  CACHE_TIMESTAMP_FILE: process.env.CACHE_TIMESTAMP_FILE ?? './delete_cache_last_run',
  CACHE_TTL: parseInt(process.env.CACHE_TTL ?? '24'),
  S3FS_MOUNT: process.env.S3FS_MOUNT ?? './s3',
  WILDCARD_DOMAIN: process.env.WILDCARD_DOMAIN ?? 'db.example.com',
}