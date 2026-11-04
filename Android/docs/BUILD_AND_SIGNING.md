# Build and private signing

Verified host: macOS arm64, Temurin JDK 17.0.21+9, Gradle 9.6.0, SDK platform 37.0 r02, build-tools 36.0.0. Compile/target 37, minimum 29. Dependency versions and resolved locks are committed; no dynamic versions. Release is deliberately unminified for this test candidate. A reproducible environment is documented; byte-for-byte independent rebuild identity is not claimed.

Open Android/ as the Gradle project. Install JDK 17 and the Android SDK with platform 37.0/build-tools 36.0.0 through official tooling and accept applicable licenses yourself. Set JAVA_HOME and ANDROID_HOME (or an ignored local.properties sdk.dir). The checked-in Gradle wrapper verifies its pinned distribution SHA-256. Standard commands from Android/:

```sh
./gradlew :core:test :app:testDebugUnitTest :app:lintRelease :app:assembleRelease
ANDROID_SERIAL=emulator-5554 ./gradlew :app:connectedDebugAndroidTest
```

The core tests read the original ../tests/fixtures evidence, so retain the repository layout. Instrumented tests disable automatic restore and use test-only fixtures; production has no fixture assets or embedded JS. Use a disposable authorized emulator for instrumentation: Gradle can replace/remove the test application. Do not run this against an owner's configured phone.

This workspace additionally has an ignored project-local toolchain. `tools/gradle-local.sh` selects its JDK/SDK/Gradle/cache paths; it requires the existing local provisioning and is not an automatic SDK installer. Tool/download evidence is in docs/ENVIRONMENT.json. SDK/AVD caches, tool archives and licenses are not release assets.

## Signing continuity

The private candidate uses application ID `lv.turiba.next`, code 1, name 0.1.0-rc.1, one RSA-3072 owner certificate. Public certificate digest and candidate SHA-256 are in RELEASE.json. Signature scheme v3 is appropriate to minSdk 29; the local apksigner verification and 16-KiB zip alignment check pass. No key/password is committed or published.

The owner key is at ignored `Android/.signing/owner-release.jks`; its password is in ignored `.signing/password`. Directory mode 700 and key/password mode 600. **Securely back up both files outside this workspace in owner-controlled protected storage before relying on updates.** Losing the key prevents same-identity updates. Do not paste the password in chat or commit either file. No external backup has been performed by the agent.

`tools/sign-release-local.sh` signs the unsigned release with that existing key, aligns ZIP entries and verifies the result. It deliberately refuses missing keys. Default output is ignored `delivery/TURIBA-NEXT-Android-0.1.0-rc.1.apk`. Example:

```sh
./tools/gradle-local.sh :app:assembleRelease
./tools/sign-release-local.sh
```

For a new update, choose a larger versionCode and appropriate versionName through `-PreleaseVersionCode=... -PreleaseVersionName=...`; pass the intended output path as the signing script's second argument. Never generate a replacement key to solve an update error. The debug certificate differs from the private release certificate.

Owner amendment 2026-11-04: the first test APK may be published inside Android/ on the authorized GitHub repository. The published file is the existing signed code 1 candidate, not a new stable v1.0 build. Signing keys/passwords remain private. Store publication, unrelated artifacts and additional distribution channels require separate authorization.
