#!/usr/bin/env bash

set -euo pipefail

DOMAIN="db.postgres.new"
EMAIL="julien@supabase.io"
CLOUD_FLARE_INI="/cloudflare.ini"
DEPLOY_HOOK="/deploy-hook.sh"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

renew_certificate() {
    echo "Certificates exist. Renewing..."
    certbot renew --non-interactive \
        --dns-cloudflare \
        --dns-cloudflare-credentials "${CLOUD_FLARE_INI}" \
        --deploy-hook "${DEPLOY_HOOK}"
}

create_certificate() {
    echo "Certificates do not exist. Creating..."
    certbot certonly --non-interactive \
        --agree-tos \
        --email "${EMAIL}" \
        --dns-cloudflare \
        --dns-cloudflare-credentials "${CLOUD_FLARE_INI}" \
        --dns-cloudflare-propagation-seconds 60 \
        -d "*.${DOMAIN}" \
        --deploy-hook "${DEPLOY_HOOK}"
}

main() {
    if [[ -f "${CERT_PATH}" ]]; then
        renew_certificate
    else
        create_certificate
    fi
}

main "$@"