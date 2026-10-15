#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MAESTRO_BIN="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
FLOW_FILE="$ROOT_DIR/.maestro/08_apple_review_demo.yaml"

# Maestro 2.x needs Java 17+. Prefer a user-local JDK when the system Java is older.
if [[ -z "${JAVA_HOME:-}" && -x "$HOME/.local/jdk/bin/java" ]]; then
  export JAVA_HOME="$HOME/.local/jdk"
  export PATH="$JAVA_HOME/bin:$PATH"
fi
REVIEW_EMAIL="${REVIEW_EMAIL:-review@aanganstay.com}"
REVIEW_PASSWORD="${REVIEW_PASSWORD:-}"

if [[ ! -x "$MAESTRO_BIN" ]]; then
  echo "Maestro binary not found at $MAESTRO_BIN"
  echo "Install Maestro first or set MAESTRO_BIN to the correct path."
  exit 1
fi

if [[ -z "$REVIEW_PASSWORD" ]]; then
  echo "Set REVIEW_PASSWORD before running this script."
  echo "Example: REVIEW_PASSWORD='your-demo-password' ./scripts/apple-review-demo.sh"
  exit 1
fi

echo "Starting Apple review demo flow from $FLOW_FILE"
"$MAESTRO_BIN" test "$FLOW_FILE" -e REVIEW_EMAIL="$REVIEW_EMAIL" -e REVIEW_PASSWORD="$REVIEW_PASSWORD"