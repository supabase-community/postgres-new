#!/bin/bash

set -e
set -o pipefail

S3FS_MOUNT=${S3FS_MOUNT:=.}
CERT_DIR="$S3FS_MOUNT/tls"

mkdir -p $CERT_DIR
cd $CERT_DIR

openssl genpkey -algorithm RSA -out ca-key.pem
openssl req -new -x509 -key ca-key.pem -out ca-cert.pem -days 365 -subj "/CN=MyCA"

openssl genpkey -algorithm RSA -out key.pem
openssl req -new -key key.pem -out csr.pem -subj "/CN=*.db.example.com"

openssl x509 -req -in csr.pem -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out cert.pem -days 365

# Create fullchain by concatenating the server certificate and the CA certificate
cat cert.pem ca-cert.pem > fullchain.pem

# Replace cert.pem with the fullchain
mv fullchain.pem cert.pem