import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isMap, isSeq, parseDocument, YAMLSeq, type Document, type YAMLMap } from 'yaml';
import { addFileDependency, ensureProjectManifest, readStackName } from './project.js';

/** Outcome of writing a component into `mdk.yaml`. */
/**
 * Outcome of writing a component into `mdk.yaml`. `exists`: this package is
 * already listed (a re-add is a no-op). `name-taken`: another package holds the
 * name, so nothing was written.
 */
export type StackFileUpdate = 'added' | 'exists' | 'name-taken' | 'no-file' | 'error';

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Copies a bundled template to `dest`, replacing every `tokens` key with its value in each file. */
export function copyTemplate(src: string, dest: string, tokens: Record<string, string>): void {
  cpSync(src, dest, { recursive: true });
  for (const file of walk(dest)) {
    const content = readFileSync(file, 'utf8');
    const replaced = Object.entries(tokens).reduce((text, [token, value]) => text.replaceAll(token, value), content);
    if (replaced !== content) writeFileSync(file, replaced, 'utf8');
  }
}

/** Sets `fields` on a JSON file and writes it back (2-space indented). */
export function updateJson(file: string, fields: Record<string, unknown>): void {
  const json = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  writeFileSync(file, `${JSON.stringify({ ...json, ...fields }, null, 2)}\n`, 'utf8');
}

/**
 * `mdk run` resolves components through the project's node_modules via a `file:`
 * dependency (no `workspaces` key on the root manifest). Best effort: an unparseable
 * project package.json must not undo the files already scaffolded, so a failure is
 * returned as a warning instead of thrown. No-op outside an MDK project.
 */
export function linkIntoProject(parentDir: string, packageName: string, packageDir: string): string | undefined {
  const stackName = readStackName(parentDir);
  if (!stackName) return undefined;
  try {
    ensureProjectManifest(parentDir, stackName);
    addFileDependency(parentDir, packageName, packageDir);
    return undefined;
  } catch (error) {
    return `Could not link ${packageName} into package.json: ${errorText(error)}`;
  }
}

/**
 * Appends one entry named `name` to `spec.<list>` in `<parentDir>/mdk.yaml`, editing
 * the parsed document so the file's formatting and comments survive. An entry
 * `isSame` accepts makes a re-add a no-op (`'exists'`); any other entry with the
 * same name is a conflict (`'name-taken'`). `build` gets the document so it can
 * derive values from it.
 */
export function appendToStackList(
  parentDir: string,
  list: 'apps' | 'workers',
  name: string,
  isSame: (entry: YAMLMap) => boolean,
  build: (doc: Document) => unknown,
): StackFileUpdate {
  const specPath = resolve(parentDir, 'mdk.yaml');
  if (!existsSync(specPath)) return 'no-file';

  try {
    const doc = parseDocument(readFileSync(specPath, 'utf8'));
    if (!isSeq(doc.getIn(['spec', list]))) doc.setIn(['spec', list], new YAMLSeq());
    const items = doc.getIn(['spec', list]) as YAMLSeq;
    // Onboarding writes an empty list as `[]`, a flow sequence: anything appended
    // to it would render inline, so switch it to block style first.
    items.flow = false;

    const entries = items.items.filter(isMap) as YAMLMap[];
    if (entries.some(isSame)) return 'exists';
    if (entries.some((entry) => entry.get('name') === name)) return 'name-taken';

    items.add(build(doc));
    writeFileSync(specPath, doc.toString(), 'utf8');
    return 'added';
  } catch {
    return 'error';
  }
}
