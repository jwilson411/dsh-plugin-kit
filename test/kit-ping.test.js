/**
 * Offline behaviour tests for the kit's plugin and its one tool.
 *
 * Nothing here boots a profile, opens a socket, or needs an API key: `apply`
 * receives a stub context that records registrations, and the tool definition
 * is exercised through the same `execute` the registry would call.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { defineTool, ToolArgsError, validateJsonSchemaValue } from '@deepseek-ai/dsh-tools'

import { apply, inject, KIT_PING_TOOL_NAME, PLUGIN_NAME } from '../src/index.js'

/**
 * A context stub exposing only what `apply` is allowed to touch.
 * @returns The stub context and the definitions it recorded.
 */
function stubContext() {
  const registered = []
  const disposers = []
  const ctx = {
    tools: {
      register(definition) {
        registered.push(definition)
        const dispose = () => disposers.push(definition.name)
        return dispose
      },
    },
  }
  return { ctx, registered, disposers }
}

/** The execution context the registry passes to `execute`; unused by this tool. */
const exec = { signal: new AbortController().signal }

test('apply registers exactly one tool, named kit_ping', () => {
  const { ctx, registered } = stubContext()

  apply(ctx)

  assert.equal(registered.length, 1)
  assert.equal(registered[0].name, KIT_PING_TOOL_NAME)
  assert.deepEqual(inject, ['tools'])
})

test('the registered tool declares an object parameter schema requiring `who`', () => {
  const { ctx, registered } = stubContext()
  apply(ctx)
  const [tool] = registered

  assert.equal(tool.parameters.type, 'object')
  assert.deepEqual(tool.parameters.required, ['who'])
  assert.equal(tool.parameters.properties.who.type, 'string')
  assert.equal(typeof tool.description, 'string')
  assert.ok(tool.description.length > 0)
})

test('successful execution returns a value shaped by the declared output schema', async () => {
  const { ctx, registered } = stubContext()
  apply(ctx)
  const [tool] = registered

  const value = await tool.execute({ who: 'ada' }, exec)

  assert.deepEqual(validateJsonSchemaValue(tool.output.schema, value, 'kit_ping'), [])
  assert.deepEqual(value, {
    message: `hello, ada — ${PLUGIN_NAME} is registered and answering`,
    greeted: 'ada',
    plugin: PLUGIN_NAME,
  })
})

test('render projects the canonical value into one text content block', async () => {
  const { ctx, registered } = stubContext()
  apply(ctx)
  const [tool] = registered

  const value = await tool.execute({ who: 'ada' }, exec)

  assert.deepEqual(tool.output.render({ who: 'ada' }, value), [
    { type: 'text', text: value.message },
  ])
})

test('invalid arguments fail loudly instead of executing', async () => {
  const { ctx, registered } = stubContext()
  apply(ctx)
  const [tool] = registered

  for (const args of [{}, { who: 42 }, { who: null }, null, [], 'ada']) {
    await assert.rejects(
      () => tool.execute(args, exec),
      (error) => {
        assert.ok(error instanceof ToolArgsError)
        assert.ok(error.violations.length > 0)
        return true
      },
      `expected ToolArgsError for ${JSON.stringify(args) ?? String(args)}`,
    )
  }
})

test('validation runs before the body, so a rejected call never reaches it', async () => {
  // A probe built with the same helper the plugin uses: the body counts its
  // own calls, proving the guard is the API's and not the tool's own checking.
  let bodyCalls = 0
  const probe = defineTool({
    name: 'kit_ping_probe',
    description: 'Test probe recording whether the body ran.',
    parameters: { who: { type: 'string', required: true } },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true } } },
      render: () => [{ type: 'text', text: 'ok' }],
    },
    execute() {
      bodyCalls += 1
      return Promise.resolve({ ok: true })
    },
  })

  await assert.rejects(() => probe.execute({}, exec), ToolArgsError)
  assert.equal(bodyCalls, 0)

  await probe.execute({ who: 'ada' }, exec)
  assert.equal(bodyCalls, 1)
})

test('unknown properties are tolerated: the parameter root is an open object', async () => {
  // `defineTool` compiles the parameter map to an implicit OPEN object root —
  // the emitted schema carries no `additionalProperties: false`, and the API
  // exposes no way to close it. A template that asserted rejection here would
  // be asserting against the registry's actual contract, so this pins the real
  // behaviour instead: the extra key is ignored, not honoured.
  const { ctx, registered } = stubContext()
  apply(ctx)
  const [tool] = registered

  assert.equal(tool.parameters.additionalProperties, undefined)

  const value = await tool.execute({ who: 'ada', unknown: true }, exec)

  assert.deepEqual(validateJsonSchemaValue(tool.output.schema, value, 'kit_ping'), [])
  assert.equal(value.greeted, 'ada')
  assert.equal(Object.hasOwn(value, 'unknown'), false)
})

test('the manifest declares the bundle patch the profile installer looks for', () => {
  const manifestPath = fileURLToPath(new URL('../package.json', import.meta.url))
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')

  const patchPath = fileURLToPath(new URL('../cordis.patch.yml', import.meta.url))
  const patch = readFileSync(patchPath, 'utf8')
  assert.match(patch, /^- insert:$/m)
  assert.match(patch, new RegExp(`name: ${manifest.name}$`, 'm'))
})
