import { installSkills } from '@tetherto/mdk-skill';

export type SkillClient = 'cursor' | 'claude' | 'all';

export interface SkillResult {
  ok: boolean;
  message: string;
  detail?: string;
  // Set on success when some existing skill dirs were left untouched.
  warning?: string;
}

/**
 * Installs the MDK Developer Skill suite into the target project via the
 * `@tetherto/mdk-skill` package's programmatic entry point. The package is a
 * regular dependency (resolved through node/npm), so this works the same when
 * the CLI is installed from npm and when it runs inside the monorepo workspace.
 */
export function installSkill(client: SkillClient, targetDir: string): SkillResult {
  try {
    // Skips are reported once, through `detail`, rather than via console.warn
    // mid-spinner.
    const result = installSkills({ client, target: targetDir, onWarn: () => {} });
    const clients = result.installed.map((entry) => entry.client).join(', ');
    // Existing dirs the suite does not own (symlinks, unmarked skills) are left
    // alone; name them so the user knows which skills did not land. Stale suite
    // skills swept from an earlier install are reported separately as info.
    const skipped = result.skipped ?? [];
    const removed = [...new Set(result.installed.flatMap((entry) => entry.removed ?? []))];
    return {
      ok: true,
      message: `Installed ${result.skills.length} skill(s) for ${clients}.`,
      ...(removed.length
        ? { detail: `Removed ${removed.length} stale skill(s): ${removed.join(', ')}.` }
        : {}),
      ...(skipped.length
        ? {
            warning: `Skipped ${skipped.length} existing skill dir(s): ${skipped
              .map((entry) => `${entry.dir} (${entry.reason})`)
              .join('; ')}`,
          }
        : {}),
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
