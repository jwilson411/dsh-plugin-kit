/**
 * dsh-plugin-kit — a template DeepSeek Harness function plugin.
 *
 * The plugin registers exactly one model-facing tool, `kit_ping`, against the
 * `tools` service and owns nothing else. Registration happens inside `apply`
 * so the Cordis fiber owns the effect: stopping, updating, or reloading the
 * plugin unregisters the tool with no bookkeeping here. Named exports preserve
 * the loader's injection metadata.
 * @module dsh-plugin-kit
 */
import { defineTool } from '@deepseek-ai/dsh-tools'

/** The plugin's own identity, echoed by the tool so a caller can confirm the source. */
export const PLUGIN_NAME = 'dsh-plugin-kit'

/** The one model-facing tool name this plugin owns. */
export const KIT_PING_TOOL_NAME = 'kit_ping'

/** Cordis plugin name, used in loader diagnostics and the runtime plugin tree. */
export const name = 'plugin-kit'

/**
 * `tools` is a hard dependency: with no registry there is nothing for this
 * plugin to do, so it waits rather than degrading.
 */
export const inject = ['tools']

/**
 * Build the `kit_ping` tool definition.
 *
 * Kept as a factory rather than a module-scope constant so nothing is
 * constructed at import time and each `apply` owns its own definition.
 * Exported for tests and for templates that re-register it elsewhere.
 * @returns A registry-ready tool definition.
 */
export function createKitPingTool() {
  return defineTool({
    name: KIT_PING_TOOL_NAME,
    description:
      'Greet a caller and report which plugin answered. A liveness check for the ' +
      'plugin kit: it reads nothing, writes nothing, and reaches no network.',
    parameters: {
      who: {
        type: 'string',
        required: true,
        description: 'Who to greet — a short name echoed back verbatim in the greeting.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          message: {
            type: 'string',
            required: true,
            description: 'The rendered greeting.',
          },
          greeted: {
            type: 'string',
            required: true,
            description: 'The `who` argument, echoed back unchanged.',
          },
          plugin: {
            type: 'string',
            required: true,
            const: PLUGIN_NAME,
            description: 'The plugin that registered the tool that answered.',
          },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.message }],
    },
    execute(args) {
      return Promise.resolve({
        message: `hello, ${args.who} — ${PLUGIN_NAME} is registered and answering`,
        greeted: args.who,
        plugin: PLUGIN_NAME,
      })
    },
  })
}

/**
 * Register the kit's single tool for the lifetime of this plugin's fiber.
 * @param ctx - the injected Cordis context, with `tools` resolved.
 */
export function apply(ctx) {
  ctx.tools.register(createKitPingTool())
}
