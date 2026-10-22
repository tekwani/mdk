import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LabeledCard } from '../labeled-card'

// Radix's TooltipTrigger marks its element with `data-state`; a bare title has none.
const title = (text: string): HTMLElement => screen.getByText(text)

describe('labeledCard', () => {
  it('puts a tooltip on the label when labelTooltip is set', () => {
    render(
      <LabeledCard label="Miners with error" labelTooltip="Excludes minor errors">
        body
      </LabeledCard>,
    )

    expect(title('Miners with error')).toHaveAttribute('data-state', 'closed')
  })

  it('no longer adds a tooltip based on the label text alone', () => {
    render(<LabeledCard label="Miners with error">body</LabeledCard>)

    expect(title('Miners with error')).not.toHaveAttribute('data-state')
  })

  it('links the label when getNavigateOptions returns an href', () => {
    render(
      <LabeledCard label="Pools" getNavigateOptions={() => ({ href: '#pools', target: '_self' })}>
        body
      </LabeledCard>,
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '#pools')
  })
})
