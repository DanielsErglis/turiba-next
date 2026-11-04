#!/bin/sh
# Private owner key and password files are intentionally outside version control.
set -eu
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
export JAVA_HOME="$PROJECT_DIR/.toolchain/jdk-17.0.21+9/Contents/Home"
SIGNER="$PROJECT_DIR/.toolchain/sdk/build-tools/36.0.0/apksigner"
ALIGNER="$PROJECT_DIR/.toolchain/sdk/build-tools/36.0.0/zipalign"
KEY_DIR="$PROJECT_DIR/.signing"
INPUT=${1:-"$PROJECT_DIR/app/build/outputs/apk/release/app-release-unsigned.apk"}
OUTPUT=${2:-"$PROJECT_DIR/delivery/TURIBA-NEXT-Android-0.1.0-rc.1.apk"}
test -f "$KEY_DIR/owner-release.jks"
test -f "$KEY_DIR/password"
mkdir -p "$(dirname -- "$OUTPUT")"
umask 077
ALIGNED=$(mktemp "$PROJECT_DIR/.toolchain/aligned-XXXXXX.apk")
trap 'rm -f "$ALIGNED"' EXIT HUP INT TERM
"$ALIGNER" -f -P 16 4 "$INPUT" "$ALIGNED"
"$SIGNER" sign --ks "$KEY_DIR/owner-release.jks" --ks-key-alias turiba-next \
  --ks-pass "file:$KEY_DIR/password" --out "$OUTPUT" "$ALIGNED"
"$SIGNER" verify --verbose --print-certs "$OUTPUT"
"$ALIGNER" -c -P 16 4 "$OUTPUT"
shasum -a 256 "$OUTPUT"
