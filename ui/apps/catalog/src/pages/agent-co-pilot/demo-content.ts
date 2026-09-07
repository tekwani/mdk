/**
 * The copy this demo page drives the panel with, kept out of the page itself.
 *
 * Tools come from whichever MCP server the operator points the agent at, so the
 * package humanizes anything it is not given a label for — these are the labels
 * for the reference site tools the stand-in gateway implements.
 */

export const TOOL_LABELS = {
  summarize_site: 'Site status',
  count_devices: 'Device count',
  get_device: 'Device telemetry',
  act_device: 'Send command',
}

export type DemoPrompt = {
  prompt: string
  /** What the prompt is there to demonstrate. */
  shows: string
}

export const PROMPTS: DemoPrompt[] = [
  { prompt: 'How is the site doing?', shows: 'a read — tool chip, then a table' },
  { prompt: 'How many miners are there?', shows: 'a different tool' },
  { prompt: 'Reboot demo-miner-a-0', shows: 'a write — pauses on the approval card' },
  { prompt: 'What did our energy cost last week?', shows: 'a decline — no tool call, not an error' },
]
