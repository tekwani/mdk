/**
 * Shared ts-morph utilities for doc generators.
 *
 * Used by:
 *   - packages/react-devkit/scripts/generate-registry.mts
 *   - packages/ui-foundation/scripts/generate-stores.mts
 */
import { Node, type InterfaceDeclaration } from "ts-morph";

/**
 * Summarize an interface's members as a compact definition string.
 * Properties become their names; methods become `name()`.
 *
 * @param iface - The ts-morph InterfaceDeclaration to summarize
 * @param maxChars - Optional max length for the joined members (before braces)
 * @returns A string like `{ foo, bar, baz() }` or `{}`
 */
export function summarizeInterfaceMembers(
  iface: InterfaceDeclaration,
  maxChars?: number
): string {
  const members = iface
    .getMembers()
    .map((m) => {
      if (Node.isPropertySignature(m)) return m.getName();
      if (Node.isMethodSignature(m)) return `${m.getName()}()`;
      return "";
    })
    .filter(Boolean);

  if (!members.length) return "{}";

  let joined = members.join(", ");
  if (maxChars !== undefined && joined.length > maxChars - 4) {
    // -4 accounts for `{ ` and ` }`
    joined = `${joined.slice(0, maxChars - 5).trimEnd()}…`;
  }
  return `{ ${joined} }`;
}
