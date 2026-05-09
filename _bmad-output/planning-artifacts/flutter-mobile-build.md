# Flutter Mobile Build Runbook

- **Date:** 2026-05-09 19:53 GMT+7
- **Project:** `apps/mobile_flutter`
- **Target:** Android APK and Play Store app bundle.
- **Status:** blocked by local Flutter SDK bootstrap and missing Android platform directory.

## Current Project State

The Flutter source tree currently contains Dart source, assets, tests, `pubspec.yaml`, and `pubspec.lock`, but no platform build directory:

```text
apps/mobile_flutter/
  assets/
  lib/
  test/
  pubspec.yaml
  pubspec.lock
```

`android/` is required before `flutter build apk` or `flutter build appbundle` can produce artifacts.

## Local Toolchain Attempt

Commands attempted:

```bash
rtk proxy flutter --version
rtk proxy flutter doctor -v
```

Both commands triggered Flutter snap first-run initialization and attempted to download:

```text
https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.41.9-stable.tar.xz
```

The SDK archive is approximately 1.4GB. Download speed during this session ranged around 120-300KB/s with an estimated completion time of 80-180 minutes, so the download was terminated and APK/AAB builds were not run.

## Required Build Setup

Use a fully installed Flutter SDK before running the build. Recommended minimum local tools:

```text
Flutter stable >= 3.38
Dart >= 3.10
JDK 17
Android SDK command-line tools
Android platform SDK installed
Android build-tools installed
```

Verify:

```bash
rtk proxy flutter --version
rtk proxy flutter doctor -v
```

## Platform Directory Bootstrap

From `apps/mobile_flutter`, generate Android platform files only after reviewing the generated package/application IDs:

```bash
rtk proxy flutter create --platforms=android .
```

Then confirm Android metadata:

```text
android/app/build.gradle
android/app/src/main/AndroidManifest.xml
android/app/src/main/res/mipmap-*/ic_launcher.*
```

Set the package/application ID to the approved production value before release.

## Build Procedure

From `apps/mobile_flutter`:

```bash
rtk proxy flutter pub get
rtk proxy flutter analyze
rtk proxy flutter test
rtk proxy flutter build apk --release
rtk proxy flutter build appbundle --release
```

Expected outputs:

```text
build/app/outputs/flutter-apk/app-release.apk
build/app/outputs/bundle/release/app-release.aab
```

Size checks:

```bash
rtk proxy du -h build/app/outputs/flutter-apk/app-release.apk
rtk proxy du -h build/app/outputs/bundle/release/app-release.aab
```

Phase 25.10 target is APK under 25MB and build time under 10 minutes on a warmed SDK/toolchain.

## Device Install Check

With an Android device or emulator attached:

```bash
rtk proxy flutter devices
rtk proxy flutter install --release
```

Verify:

- App installs without Play Protect or signing warnings.
- Launcher icon is not the default Flutter icon.
- App opens to the expected LinkSnap mobile entry screen.
- API base URL points to production or approved staging, not localhost.

## Blocker Resolution

To finish 25.10, complete these in order:

1. Install or finish downloading Flutter stable SDK.
2. Generate and review `android/` platform files.
3. Run `flutter pub get`, `analyze`, and `test`.
4. Build APK and AAB.
5. Install on a device/emulator and verify icon/startup.

Do not mark the APK/AAB checklist complete until real artifacts exist under `build/app/outputs/`.
