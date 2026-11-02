#!/usr/bin/env bash
# Generates a local dev CA + server (services/api) + client (services/agent)
# certificate pair for mTLS, used only for local demo/dev runs. Never commit
# the output (.dev/certs/ is gitignored) and never use these in production —
# real cert issuance/rotation is out of scope for Phase 5.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/.dev/certs"
mkdir -p "$OUT_DIR"
cd "$OUT_DIR"

echo "Generating dev CA + server + agent certs in $OUT_DIR"

# CA
openssl ecparam -name prime256v1 -genkey -noout -out ca-key.pem
openssl req -x509 -new -key ca-key.pem -days 365 -out ca-cert.pem -sha256 \
  -subj "/O=Klyro Dev/CN=klyro-dev-ca"

# Server (services/api) — SAN must include localhost since the agent dials it there
openssl ecparam -name prime256v1 -genkey -noout -out server-key.pem
openssl req -new -key server-key.pem -out server.csr -subj "/O=Klyro Dev/CN=klyro-api"
openssl x509 -req -in server.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
  -out server-cert.pem -days 365 -sha256 \
  -extfile <(printf "subjectAltName=DNS:localhost,DNS:klyro-api,IP:127.0.0.1")

# Agent (services/agent)
openssl ecparam -name prime256v1 -genkey -noout -out agent-key.pem
openssl req -new -key agent-key.pem -out agent.csr -subj "/O=Klyro Dev/CN=klyro-agent"
openssl x509 -req -in agent.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
  -out agent-cert.pem -days 365 -sha256 \
  -extfile <(printf "subjectAltName=DNS:klyro-agent")

rm -f server.csr agent.csr ca-cert.srl
echo "Done: ca-cert.pem, server-{cert,key}.pem, agent-{cert,key}.pem"
