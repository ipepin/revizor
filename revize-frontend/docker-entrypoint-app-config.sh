#!/bin/sh
set -eu

cat > /usr/share/nginx/html/app-config.js <<EOF
window.__APP_CONFIG__ = {
  apiOrigin: "${API_ORIGIN}",
  routerMode: "${ROUTER_MODE:-hash}"
};
EOF
