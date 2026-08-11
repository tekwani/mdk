import type { JSX } from "react"

import { EmptyState } from "@primitives"

export type ContainerDetailPlaceholderProps = {
  /** Human label of the tab this placeholder stands in for, e.g. "PDU Layout". */
  label: string
}

/**
 * Stand-in body for container detail tabs whose real content has not been built
 * yet. The shell (`ContainerDetail`) renders one of these per tab until the tab
 * component lands, so the page frame is fully navigable ahead of the tab work.
 *
 * @category features
 * @domain device-management
 * @tier internal
 */
export const ContainerDetailPlaceholder = ({
  label,
}: ContainerDetailPlaceholderProps): JSX.Element => (
  <EmptyState description={`${label} — coming soon`} />
)

ContainerDetailPlaceholder.displayName = "ContainerDetailPlaceholder"
