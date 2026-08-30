# Platform verification

Verification date: 2026-08-30.

## Confirmed

| Concern                  | Confirmed contract                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Required manifest        | `.codex-plugin/plugin.json`                                                                                                  |
| Workflow instructions    | One or more skill folders containing `SKILL.md`                                                                              |
| Actions/tools            | MCP server tools with explicit input/output schemas and safety annotations                                                   |
| Bundled local server     | `.mcp.json`, referenced by `mcpServers`                                                                                      |
| Registered remote server | `.app.json` compatibility mapping after registration                                                                         |
| Authentication           | Defined by the MCP connection/server when needed; not needed for this local read-only plugin                                 |
| Files/resources          | Skills may package references, scripts, templates, and assets; MCP may expose resources                                      |
| Marketplace              | `.agents/plugins/marketplace.json` for a Codex marketplace                                                                   |
| Local testing            | Add a marketplace, install the plugin, and start a new task                                                                  |
| Public publication       | Submission portal, automated scanning, policy metadata, review, then explicit publish                                        |
| Security                 | Accurate tool boundaries, least privilege, schema validation, safe annotations, privacy/legal metadata for public submission |

## Runtime constraints

- A bundled stdio MCP server depends on a local runtime and makes the implementation desktop/local-oriented.
- The plugin runtime is not an arbitrary durable hosting environment.
- Installation does not grant connected-service access or bypass workspace permissions.
- Tool annotations are hints, not replacements for authorization, validation, or confirmation.
- Public MCP metadata and skill snapshots are reviewed and versioned; changes require a new reviewed version.

## Unverified

The `agent-plugins.com` domain did not resolve and no separate official documentation, manifest schema, runtime API, authentication model, or publishing procedure could be verified for that domain. No domain-specific keys or APIs were invented. The safe assumption is the current OpenAI universal plugin architecture documented at `developers.openai.com/plugins`.

## Primary sources

- https://developers.openai.com/plugins/concepts/plugins
- https://developers.openai.com/plugins/plan/tools
- https://developers.openai.com/plugins/build/plugins
- https://developers.openai.com/plugins/deploy/submission
- https://developers.openai.com/plugins/guides/security-privacy
- https://developers.openai.com/plugins/app-guidelines
- https://developers.openai.com/plugins/deploy/app-review
