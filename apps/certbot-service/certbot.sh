#!/usr/bin/env bash

set -euo pipefail

CONFIG_DIR="${S3FS_MOUNT}/tls/letsencrypt"
CERT_PATH="${CONFIG_DIR}/live/${CERTBOT_DOMAIN}/fullchain.pem"
CLOUD_FLARE_INI="/app/cloudflare.ini"
DEPLOY_HOOK="/app/deploy-hook.sh"

renew_certificate() {
    echo "Certificates exist. Renewing..."
    certbot renew --non-interactive \
        --dns-cloudflare \
        --dns-cloudflare-credentials "${CLOUD_FLARE_INI}" \
        --deploy-hook "${DEPLOY_HOOK}" \
        --config-dir "${CONFIG_DIR}"
}

create_certificate() {
    echo "Certificates do not exist. Creating..."
    certbot certonly --non-interactive \
        --agree-tos \
        --email "${CERTBOT_EMAIL}" \
        --dns-cloudflare \
        --dns-cloudflare-credentials "${CLOUD_FLARE_INI}" \
        --dns-cloudflare-propagation-seconds 60 \
        -d "*.${CERTBOT_DOMAIN}" \
        --deploy-hook "${DEPLOY_HOOK}" \
        --config-dir "${CONFIG_DIR}"
}

main() {
    if [[ -f "${CERT_PATH}" ]]; then
        renew_certificate
    else
        create_certificate
    fi
}

main "$@"