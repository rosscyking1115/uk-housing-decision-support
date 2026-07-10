# Security Policy

## Reporting a vulnerability

If you find a security issue in this project, please report it privately rather
than opening a public issue.

- **Email:** rosscyking@gmail.com
- Include steps to reproduce and, if possible, the affected file or endpoint.

You can expect an acknowledgement within a few days. Please give a reasonable
window to address the issue before any public disclosure.

## Scope

This is a reference analytics-engineering project built over public open data.
There is no user data, no authentication, and no secrets in the repository:

- The API ([`api/`](api/)) is read-only over a committed, derived DuckDB extract
  (`data/decision.duckdb`) — public open data only.
- Real dbt profiles and any credentials are git-ignored (`profiles.yml`, `.env`);
  see [`.gitignore`](.gitignore).

Reports about the handling of the underlying open data, the API surface, or the
build pipeline are all welcome.
