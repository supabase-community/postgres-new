#!/bin/bash

set -e
set -o pipefail

cleanup() {
  echo "Unmounting S3 bucket..."
  umount $S3FS_MOUNT
  exit 0
}

forward_signal() {
  kill -$1 "$MAIN_PID"
}

trap 'forward_signal SIGINT' SIGINT
trap 'forward_signal SIGTERM' SIGTERM
trap 'cleanup' EXIT

# Create the mount point directory
mkdir -p $S3FS_MOUNT

# Mount the S3 bucket
mount-s3 $BUCKET_NAME $S3FS_MOUNT --force-path-style --endpoint-url $AWS_ENDPOINT_URL_S3 --region $AWS_REGION 

# Check if the mount was successful
if mountpoint -q $S3FS_MOUNT; then
  echo "S3 bucket mounted successfully at $S3FS_MOUNT"
else
  echo "Failed to mount S3 bucket"
  exit 1
fi

# Execute the original command
"$@" &
MAIN_PID=$!

wait $MAIN_PID
