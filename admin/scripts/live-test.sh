#!/usr/bin/env bash
# Provision a fresh token pair, then run the opt-in live API tests.
#
# The backend rotates refresh tokens on every use, so these have to be minted
# immediately before the run — a token file from a previous run is already
# spent. Requires the backend stack up and running in DEV mode (for `dev_otp`).
set -euo pipefail

API="${NEXT_PUBLIC_API_URL:-http://localhost:8000}"
PHONE="${LIVE_API_PHONE:-+919900000001}"
TOKEN_FILE="${LIVE_API_TOKENS:-/tmp/civic-admin-tokens.json}"

echo "Requesting an OTP for $PHONE (waiting out any cooldown)…"
until curl -sf -X POST "$API/auth/send-otp" \
        -H 'Content-Type: application/json' \
        -d "{\"phone\":\"$PHONE\"}" -o /tmp/civic-otp.json \
      && grep -q dev_otp /tmp/civic-otp.json; do
  sleep 5
done

OTP=$(python3 -c "import json;print(json.load(open('/tmp/civic-otp.json'))['dev_otp'])")

curl -sf -X POST "$API/auth/verify-otp" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$PHONE\",\"code\":\"$OTP\"}" \
| TOKEN_FILE="$TOKEN_FILE" python3 -c "
import sys, json, os
d = json.load(sys.stdin)
role = d['user']['role']
assert role in ('admin', 'district_admin', 'taluka_admin', 'ward_admin'), role
json.dump({'a': d['access_token'], 'r': d['refresh_token']}, open(os.environ['TOKEN_FILE'], 'w'))
print('Provisioned tokens for', role)
"

RUN_LIVE_API_TESTS=1 LIVE_API_TOKENS="$TOKEN_FILE" npx jest __tests__/api/refresh.live.test.js "$@"
