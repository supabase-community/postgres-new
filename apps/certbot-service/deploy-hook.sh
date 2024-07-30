#!/usr/bin/env bash

set -euo pipefail

TARGET_DIR="/mnt/s3/tls"
DOMAIN="db.postgres.new"

# Ensure the target directory exists
mkdir -p $TARGET_DIR

# Copy the key and cert to the target directory
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $TARGET_DIR/key.pem
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $TARGET_DIR/cert.pem