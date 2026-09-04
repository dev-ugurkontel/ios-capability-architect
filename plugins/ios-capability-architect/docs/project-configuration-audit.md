# Project configuration audit

`audit_ios_project_configuration` connects capability advice to an existing local Apple-platform project without changing it.

## Inputs

- `project_root`: the local directory whose configuration surfaces may be inspected;
- `capability_ids`: one or more reviewed registry profiles;
- `platform`: `iOS`, `iPadOS`, `watchOS`, `tvOS`, `visionOS`, `macOS`, or `Mac Catalyst`, used for minimum-version comparison.

## Inspected surfaces

- `project.pbxproj`;
- `project.yml` and `project.yaml`;
- `*.plist`;
- `*.entitlements`;
- `*.xcconfig`;
- `PrivacyInfo.xcprivacy`;
- `Package.swift`.

`.git`, dependency, and generated-build directories are ignored. Symbolic links are not followed, including files changed into links during a scan. Files larger than 1 MB, more than 500 matching files, more than 1,000 traversed directories, more than 10,000 entries, and more than 5 MB of total source are excluded by bounded scan limits. Unreadable files and subdirectories are reported as skipped instead of failing the entire audit.

## Finding states

- `detected`: the expected source token was found; target membership and built output still need verification;
- `not_detected`: the expected token was not found in scanned source and requires remediation or source-of-truth review;
- `incompatible`: a detected deployment target is below the selected capability's reviewed minimum;
- `manual_review`: source files cannot prove the requirement, such as Apple-managed entitlement approval or disclosure correctness;
- `unknown`: the registry lacks enough reviewed evidence to conclude whether configuration is required.

The result redacts the supplied root as `.` and returns only relative file paths and findings, not source contents or the absolute project path. It cannot prove App ID state, signing, provisioning profiles, managed-entitlement approval, generated target membership, or runtime availability.

Native Xcode deployment targets are read from the platform-appropriate build setting: `IPHONEOS_DEPLOYMENT_TARGET`, `WATCHOS_DEPLOYMENT_TARGET`, `TVOS_DEPLOYMENT_TARGET`, `XROS_DEPLOYMENT_TARGET`, or `MACOSX_DEPLOYMENT_TARGET`. XcodeGen platform keys are mapped to the same declared platform before comparison.
