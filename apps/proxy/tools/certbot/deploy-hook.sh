#!/usr/bin/env bash

set -euo pipefail

SOURCE_DIR="$S3FS_MOUNT/tls/letsencrypt/live/$CERTBOT_DOMAIN"
TARGET_DIR="$S3FS_MOUNT/tls"

# Ensure the target directory exists
mkdir -p $TARGET_DIR

# Copy the key and cert to the target directory
cp -f $SOURCE_DIR/privkey.pem $TARGET_DIR/key.pem
cp -f $SOURCE_DIR/fullchain.pem $TARGET_DIR/cert.pem