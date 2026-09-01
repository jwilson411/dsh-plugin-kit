# Security Policy

## Reporting a Vulnerability

Please do not open a public GitHub issue for a security report.

Use GitHub's private advisory form:

https://github.com/jwilson411/dsh-plugin-kit/security/advisories/new

Include the version or commit, steps to reproduce, and what an attacker gains.

## Scope

dsh-plugin-kit is a template DeepSeek Harness function plugin. It registers one model-facing tool, `kit_ping`. The tool reads nothing, writes nothing, and opens no socket. It echoes the `who` argument in a greeting and reports the plugin name. This repository does not store, load, or transmit secrets.

An attacker who already controls the process running the harness is out of scope.

## Supported versions

Only the latest release receives security fixes.
