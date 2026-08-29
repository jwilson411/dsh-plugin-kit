# dsh-plugin-kit

A minimal, installable **function-plugin template for the DeepSeek Harness**. It is
the smallest thing that is still a real plugin: one package that is both a
profile *bundle* (it ships a patch layer) and the *plugin* that layer mounts,
registering exactly one model-facing tool, `kit_ping`.

Copy it, rename it, replace the tool.

## Install

```sh
dsh plugin --profile web add github:jwilson411/dsh-plugin-kit
```

`dsh plugin` forwards to pnpm inside `$DSH_HOME/profiles/web`, then reconciles
the profile against the installed state: because this package's manifest
declares `dsh.bundle.patch`, it is appended to the profile manifest's ordered
`dsh.profile.bundles` list and its patch becomes a layer. A package without
that declaration installs as a plain dependency and is not a layer.

Remove it the same way, with `remove` in place of `add`.

## Pinned DSH release candidate

This package is written and tested against the pinned release candidate
**`0.1.1-rc.2`** — the current `@deepseek-ai/dsh` release and the matching
`@deepseek-ai/dsh-tools@0.1.1-rc.2`, which is pinned exactly in
`devDependencies` so tests run against one known API. The peer range is
`^0.1.1-rc.2`, matching how the harness's own tool packages declare it.

Note that `@deepseek-ai/dsh-tools`'s npm `latest` tag still points at the older
`0.0.1-rc.1`; the `0.1.1-rc.2` line is published under `next`. Pin explicitly
rather than relying on the tag.

## What it registers

| | |
|---|---|
| Cordis plugin id | `plugin-kit` (the row id in `cordis.patch.yml`) |
| Injects | `tools` — a hard dependency; the plugin waits rather than degrading |
| Tool | `kit_ping` |
| Arguments | `who` (string, required) |
| Returns | `{ message, greeted, plugin }` |

`kit_ping` is a liveness check: it reads nothing, writes nothing, and reaches
no network, so it is safe to install anywhere and needs no API key.

## Layout

```
package.json        manifest + `dsh.bundle.patch` — what makes this a bundle
cordis.patch.yml    the bundle's patch layer: one insert, one plugin row
src/index.js        the plugin: `name`, `inject`, `apply(ctx)`
test/               offline tests, no network and no credentials
```

## The two halves

**The manifest declares the patch.** This field is exactly what the profile
installer looks for; without it the package is just a library:

```json
"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
```

**The patch mounts the plugin.** A patch file is a top-level YAML array of
patch entries composed over the bundles below it:

```yaml
- insert:
    - id: plugin-kit
      name: dsh-plugin-kit
```

Layers compose in order: each bundle's patch in `dsh.profile.bundles` order,
then the profile's own `cordis.patch.yml`, then the home-level file, then any
`--patch` overlays. A later layer addresses a row by its `id`. Such a patch
**replaces the row's whole `config`** rather than merging into it, so an
override must restate the fields it keeps.

Inspect the composed tree without booting it with `dsh --dump-config`.

## The plugin

Named exports preserve the loader's injection metadata, so export them
individually rather than as one default object:

```js
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'plugin-kit'
export const inject = ['tools']

export function apply(ctx) {
  ctx.tools.register(createKitPingTool())
}
```

Registration happens *inside* `apply` so the Cordis fiber owns the effect:
stopping, updating, or reloading the plugin unregisters the tool. `register`
returns a disposer for ordered ownership; a plugin that registers for its own
lifetime does not need to retain it. Do not register at module scope.

`inject: ['tools']` declares a hard dependency. For a capability the plugin can
live without, use `ctx.get('name')` and handle `undefined` instead — reaching
for `ctx.tools` without declaring the injection is rejected by the guard.

## The tool

`defineTool` infers the argument type from `parameters` and validates every
call against it before the body runs, so `execute` receives typed, validated
arguments and the failure path is the API's, not yours.

Two contract details worth knowing before you edit the schema:

- **The parameter map is an implicit *open* object root.** Each property
  carries its own `required: true`; the compiled schema has no
  `additionalProperties: false` and the API exposes no way to close it, so
  unknown keys are tolerated and ignored. Missing properties, wrong types, and
  non-object arguments all reject with `ToolArgsError`.
- **Nested and output objects must state `additionalProperties` explicitly**,
  so they never acquire an accidental default.

`output.schema` is the canonical result contract and `output.render` is the
pure projection of a validated value into the content blocks the model sees.
Both arguments and results must be lossless JSON.

## Tests

```sh
npm install
npm test
```

Offline by construction: `apply` is handed a stub context that records
registrations, and the tool is driven through the same `execute` the registry
calls. No profile boots, no socket opens, no key is read. The suite covers
registration, a successful call matching its declared output schema, the
render projection, loud failure on bad arguments, and the manifest/patch
wiring.

CI (`.github/workflows/ci.yml`) runs the same two commands on Node 22 and 24
and needs no credentials.

## Making it yours

1. Rename the package in `package.json`, and the `name:` in `cordis.patch.yml`
   to match — the patch row resolves the plugin by package name.
2. Pick a new `id` for the row and a new `name` in `src/index.js`.
3. Replace `kit_ping`: its schema, its body, its description. The description
   is model-facing — say what the tool does and when to reach for it.
4. Keep the tests honest; assert the contract you actually ship.

## License

MIT — see [LICENSE](LICENSE).
