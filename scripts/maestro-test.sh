#!/bin/bash
# Run Maestro E2E tests with the correct Java version.
# Usage:
#   ./scripts/maestro-test.sh                    # run all tests
#   ./scripts/maestro-test.sh 01_explore_tab     # run one test
#   ./scripts/maestro-test.sh --tags smoke       # run by tag

export JAVA_HOME=/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
MAESTRO=~/.maestro/bin/maestro
DIR="$(cd "$(dirname "$0")/.." && pwd)/.maestro"

if [ $# -eq 0 ]; then
  echo "Running all Maestro tests in $DIR..."
  "$MAESTRO" test "$DIR"
elif [[ "$1" == "--tags" ]]; then
  echo "Running tests with tag: $2"
  "$MAESTRO" test "$DIR" --tags "$2"
else
  echo "Running test: $1"
  "$MAESTRO" test "$DIR/$1.yaml"
fi
