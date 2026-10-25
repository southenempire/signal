#!/usr/bin/env bash
# Copy rotated secrets from signal-bot/.env into Railway without printing them.
#
#   bash scripts/push-railway-env.sh secrets   # step 1: rotated keys + NEW_SECRET_KEY, no redeploy
#   bash scripts/push-railway-env.sh finish    # step 3: after the DB is re-encrypted, swap SECRET_KEY and deploy
#
# Values are piped through `railway variable set --stdin`, so they never appear in
# command lines, shell history or this terminal.
set -euo pipefail

PROJECT=0183509c-ae34-43c4-8974-06d72f7133bb
SERVICE=signal
ENVIRONMENT=production
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
# Optional: SSH_KEY=~/.ssh/other_key to use a specific key for railway ssh.
SSH_ARGS=()
[ -n "${SSH_KEY:-}" ] && SSH_ARGS=(-i "$SSH_KEY")

value_of() {
  # Print the raw value of KEY from .env (first match), without echoing anything else.
  grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2-
}

set_var() {
  local key="$1" railway_key="${2:-$1}" val
  val="$(value_of "$key")"
  if [ -z "$val" ]; then echo "  skip $railway_key (empty in .env)"; return; fi
  printf '%s' "$val" | railway variable set "$railway_key" --stdin --skip-deploys \
    -p "$PROJECT" -s "$SERVICE" -e "$ENVIRONMENT" >/dev/null
  echo "  set  $railway_key"
}

case "${1:-}" in
  secrets)
    echo "Pushing rotated secrets (no redeploy yet):"
    set_var TELEGRAM_BOT_TOKEN
    set_var GROQ_API_KEY
    set_var SOLANA_KEYPAIR_JSON
    set_var REPORTER_SALT
    set_var BOTCHAIN_PRIVATE_KEY
    # The new wallet-encryption key goes in under a temporary name. SECRET_KEY itself must not
    # change until the production database has been re-encrypted, or users' wallets won't open.
    set_var SECRET_KEY NEW_SECRET_KEY
    echo "Done. Next: push the code, then re-encrypt the database before running 'finish'."
    ;;
  finish)
    echo "Swapping SECRET_KEY to the new key and removing NEW_SECRET_KEY:"
    set_var SECRET_KEY
    # Deleting a variable triggers a deploy on its own, which picks up the new SECRET_KEY.
    railway variable delete NEW_SECRET_KEY -p "$PROJECT" -s "$SERVICE" -e "$ENVIRONMENT" >/dev/null && echo "  deleted NEW_SECRET_KEY"
    echo "Redeploy triggered by the change. Watch it with: railway logs -p $PROJECT -s $SERVICE -e $ENVIRONMENT"
    ;;
  save-old)
    # Recover production's previous SECRET_KEY from the still-running container (its env was set
    # before the key changed), keep a local copy, and stage it in Railway as OLD_SECRET_KEY so the
    # re-encryption can run in the container without the value passing through anyone.
    KEYDIR="$HOME/.config/signal-keys"; OUT="$KEYDIR/railway-old-secret-key"
    mkdir -p "$KEYDIR" && chmod 700 "$KEYDIR"
    # The CLI can print notices on stdout, so wrap the value in markers and keep only what's between them.
    RAW="$(railway ssh ${SSH_ARGS[@]+"${SSH_ARGS[@]}"} -p "$PROJECT" -s "$SERVICE" -e "$ENVIRONMENT" -- sh -c 'printf "<<SIGKEY<<%s>>SIGKEY>>" "$SECRET_KEY"' 2>/dev/null)"
    ( umask 077; printf '%s' "$RAW" | tr -d '\r\n' | sed -n 's/.*<<SIGKEY<<\(.*\)>>SIGKEY>>.*/\1/p' > "$OUT" )
    unset RAW
    chmod 600 "$OUT"
    if [ ! -s "$OUT" ]; then echo "Could not read SECRET_KEY from the running container. Do NOT redeploy." >&2; exit 1; fi
    if grep -q '[[:space:]]' "$OUT"; then echo "Captured value contains spaces; it is not a clean key. Do NOT redeploy." >&2; exit 1; fi
    if [ "$(cat "$OUT")" = "$(value_of SECRET_KEY)" ]; then
      echo "The running container already uses the new key; nothing to recover." ; exit 0
    fi
    railway variable set OLD_SECRET_KEY --stdin --skip-deploys -p "$PROJECT" -s "$SERVICE" -e "$ENVIRONMENT" < "$OUT" >/dev/null
    echo "Saved the old production key to $OUT and staged OLD_SECRET_KEY in Railway."
    echo "Next: push the code, wait for the deploy, then run: bash scripts/push-railway-env.sh rotate"
    ;;
  rotate)
    # Runs inside the new deployment: re-encrypts /app/data/signal.db from OLD_SECRET_KEY to SECRET_KEY.
    railway ssh ${SSH_ARGS[@]+"${SSH_ARGS[@]}"} -p "$PROJECT" -s "$SERVICE" -e "$ENVIRONMENT" -- sh -c \
      'cd /app && OLD_SECRET_KEY="$OLD_SECRET_KEY" NEW_SECRET_KEY="$SECRET_KEY" DB_PATH=/app/data/signal.db node scripts/rotate-secret-key.js'
    echo "If that printed 'Re-encrypted and verified', remove the staged old key and restart:"
    echo "  railway variable delete OLD_SECRET_KEY -p $PROJECT -s $SERVICE -e $ENVIRONMENT"
    ;;
  *)
    echo "usage: bash scripts/push-railway-env.sh secrets|finish|save-old|rotate" >&2
    exit 1
    ;;
esac
