#!/bin/sh
set -eu
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
export JAVA_HOME="$PROJECT_DIR/.toolchain/jdk-17.0.21+9/Contents/Home"
export GRADLE_USER_HOME="$PROJECT_DIR/.toolchain/gradle-home"
export ANDROID_HOME="$PROJECT_DIR/.toolchain/sdk"
export ANDROID_USER_HOME="$PROJECT_DIR/.toolchain/android-user"
export XDG_CACHE_HOME="$PROJECT_DIR/.toolchain/cache"
cd "$PROJECT_DIR"
exec "$PROJECT_DIR/.toolchain/gradle-9.6.0/bin/gradle" "$@"
