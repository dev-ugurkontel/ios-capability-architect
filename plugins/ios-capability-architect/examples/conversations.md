# Example conversations

## Existing project audit

User: This XcodeGen project should use HealthKit and background delivery. Audit the current project configuration before I ship it.

Expected behavior:

- Resolves HealthKit and background-delivery profiles before inspecting files.
- Calls `audit_ios_project_configuration` against the selected project root.
- Distinguishes detected source values from missing values, unknown evidence, and manual Apple approval checks.
- Names the source files containing evidence without returning file contents.
- Requires generated-project, signing, provisioning, physical-device, and runtime verification after source fixes.
- Proposes changes in `project.yml` when it is the source of truth instead of hand-editing the generated `.xcodeproj`.

## Health and sleep

User: I want an iPhone app that analyzes sleep patterns on device and sends a notification when the trend changes.

Expected behavior:

- Assumes SwiftUI and current stable SDK unless constrained.
- Maps authorized sleep data to HealthKit and separates read permission from the HealthKit capability and purpose string.
- Explains that read denial cannot be inferred from missing HealthKit samples.
- Treats background delivery as system-scheduled, not continuous.
- Compares rule-based/Core ML/Foundation Models only if the analysis requirement justifies AI.
- Covers sensitive-data minimization, locked-device access, privacy policy, and App Store rules.

## Offline AI

User: Compare Core ML and Foundation Models for an internet-free personal journal classifier that must support older iPhones.

Expected behavior:

- Compares deployment target and Apple Intelligence hardware eligibility.
- Favors Core ML when a compact classifier and broad device support matter.
- Requires a Foundation Models runtime availability fallback.
- Keeps iOS 27 multimodal/provider additions in a beta section.

## Continuous location

User: Track a driver's position every second even after the user force-quits the app.

Expected behavior:

- Rejects the absolute guarantee.
- Explains authorization levels, background location mode, system termination, energy, and visible disclosure.
- Proposes a product-compatible bounded design and server reconciliation if justified.

## Widgets and Live Activities

User: Add a home-screen widget and Dynamic Island delivery tracker with a completion button.

Expected behavior:

- Separates WidgetKit, ActivityKit, App Intents, the Widget Extension, and optional App Group sharing.
- Explains widget timelines versus ActivityKit updates and APNs-backed remote updates.
- Adds `NSSupportsLiveActivities` and target membership guidance.

## Managed entitlement

User: Build an app that blocks selected apps for a child's homework schedule.

Expected behavior:

- Identifies FamilyControls, ManagedSettings, DeviceActivity, and applicable extensions.
- Clearly labels distribution as Apple-managed entitlement approval for app and extensions.
- Offers ordinary in-app focus/timer alternatives when device-wide control is unnecessary.

## Deprecated API

User: Should a new app use UIWebView because the implementation is shorter?

Expected behavior:

- Marks UIWebView deprecated.
- Recommends WKWebView, SFSafariViewController, or ASWebAuthenticationSession based on purpose.
- Explains migration architecture rather than giving new UIWebView code.

## Ambiguous idea

User: Make an iOS app that improves daily routines.

Expected behavior:

- States assumptions and gives an initial capability map.
- Asks no more than three questions and only when they alter architecture.
- Does not dump the Apple technology catalog.
