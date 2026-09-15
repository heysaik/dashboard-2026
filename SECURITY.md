# Security

## Reporting a vulnerability

Use [GitHub's private vulnerability reporting](https://github.com/heysaik/dashboard-2026/security/advisories/new) for security issues. Include affected versions, reproduction steps, impact, and a minimal example with synthetic data. Do not open a public issue containing exploit details, tokens, personal layout files, or account information.

This is a volunteer project. The latest release and `main` receive fixes; older versions have no guaranteed backports or response-time commitment.

## Security model

- The native macOS app is not App Sandbox–restricted. It uses private APIs for Spaces and full-display behavior; OS updates can change those interfaces.
- Generated offline HTML runs in a WebKit iframe with a restrictive content policy and a limited state bridge. This is a defense, not a claim that arbitrary imported code is safe.
- Connected widgets use bounded host requests to public HTTPS endpoints. Local/private addresses are rejected, redirects are restricted, and returned credentials are redacted. Source verification establishes that a web excerpt occurred on a page, not that the page is correct.
- API keys are stored in the user's Keychain and are not intentionally sent to the widget generator. A connection's declared host and authentication settings determine where its key is sent.
- Codex/Claude use existing CLI authentication and account services. They receive prompts, candidate definitions, and repair feedback. Web research can contact external sites. LM Studio generation uses the configured local server and has no research tools in this integration.
- Validation checks and model review can miss bugs or malicious behavior. Review imported/generated widgets before using them with sensitive inputs.

## Data and distribution

The app contains no telemetry integration or hosted Dashboard account. Network widgets contact their respective services. macOS can request Contacts or Music permissions when those widgets are used.

`~/Library/Application Support/Dashboard 2026` holds layout, notes, custom widget definitions, backups, and potentially cached source data. Do not attach that directory to a public issue. CLI authentication and Keychain entries are outside the repository and release archive.

Initial release archives are ad-hoc signed and not notarized. Verify the published checksum and obtain binaries only from this repository's Releases page, or build from source. A checksum detects a changed download; it does not replace a trusted signing identity.

CI runs with read-only repository access, no signing credentials, and no live AI accounts. Secret scanning reduces accidental disclosure; it is not a guarantee that every possible secret can be detected.
