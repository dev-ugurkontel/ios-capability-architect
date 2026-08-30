# Capability registry authoring

The runtime registry is loaded from `data/capabilities.json`, normalized into the full `CapabilityRecord` model, and validated before use.

Every normalized record contains:

`id`, `name`, `aliases`, `category`, `entity_type`, `summary`, `supported_use_cases`, `unsupported_use_cases`, `related_frameworks`, `related_capabilities`, `related_entitlements`, `related_extensions`, `platforms`, `minimum_os_version`, `sdk_availability`, `stable_or_beta`, `deprecated_status`, `supported_devices`, `hardware_requirements`, `region_restrictions`, `language_restrictions`, `on_device_level`, `network_requirement`, `cloud_dependency`, `user_permissions`, `info_plist_keys`, `xcode_capabilities`, `entitlements`, `managed_entitlements`, `background_modes`, `privacy_manifest_requirements`, `required_reason_apis`, `app_review_considerations`, `security_considerations`, `implementation_notes`, `limitations`, `recommended_alternatives`, `official_documentation`, `release_notes`, `last_verified_at`, and `keywords`.

Authoring rules:

1. Use a stable lowercase identifier.
2. Add only claims supported by linked official Apple sources.
3. Use a direct documentation page when available.
4. Set every source's `verified_at` to the actual check date.
5. Keep beta additions in distinct beta records when stable and beta capabilities would otherwise be conflated.
6. Use `managed_entitlement` when Apple approval is required for distribution.
7. Use `deprecated_api` and `stable_or_beta: deprecated` together, explain status, and provide alternatives.
8. Do not fill unknown fields with guesses. Omitted raw fields normalize to conservative empty or unknown values.
9. Run `npm run validate:registry`, `npm run verify:docs`, and `npm test` after changes.
10. Review source diffs manually before updating a record. Link success alone does not prove the claim is unchanged.
