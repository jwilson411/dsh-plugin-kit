# Contributing

## Setup

Node.js 22.14 or newer. Clone the repo, then install from the lockfile so you get the same `@deepseek-ai/dsh-tools` CI uses:

```sh
npm ci
```

Pin `@deepseek-ai/dsh-tools` at **`0.1.1-rc.2`**. The npm `latest` tag still points at `0.0.1-rc.1`; the `0.1.1-rc.2` line is published under `next`. Do not install `latest`.

## Tests

```sh
npm test
```

That runs `node --test "test/**/*.test.js"`. The suite is offline and key-free: `apply` is handed a stub context, no profile boots, no socket opens, and no credential is read.

CI (`.github/workflows/ci.yml`) runs `npm ci` then `npm test` on Node 22 and Node 24. It does not boot a DeepSeek Harness profile and does not need a token.

## Turning the template into a plugin

This repo is the template others copy. Keep `dsh.bundle.patch` pointing at `./cordis.patch.yml`. Without that field the package is a library, not a layer.

1. Rename the package in `package.json` and the `name:` in `cordis.patch.yml` so they match. The patch row resolves the plugin by package name.
2. Pick a new row `id` and a new `name` in `src/index.js`.
3. Replace `kit_ping`: schema, body, and description. The description is model-facing.
4. Keep the tests honest against the contract you ship.

Register tools inside `apply`, not at module scope. Export `name`, `inject`, and `apply` individually.

## Pull requests

Open a PR against `main`. Keep secrets and `/mnt/defiant` paths out of the tree.
