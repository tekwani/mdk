import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ErrorBoundary } from '../index'

const Boom = (): never => {
  throw new Error('chart data missing')
}

describe('errorBoundary', () => {
  // React logs caught render errors; keep the test output readable.
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined))
  afterEach(() => vi.restoreAllMocks())

  it('renders the error as an ErrorCard titled with the component name', () => {
    const { container } = render(
      <ErrorBoundary componentName="HashrateChart">
        <Boom />
      </ErrorBoundary>,
    )

    expect(
      container.querySelector('.mdk-error-boundary .mdk-error-card--inline'),
    ).toBeInTheDocument()
    expect(screen.getByText('Error in HashrateChart')).toBeInTheDocument()
    expect(screen.getByText('chart data missing')).toBeInTheDocument()
  })

  it('falls back to a generic title without a component name', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders a custom fallback instead when one is given', () => {
    render(
      <ErrorBoundary fallback={<p>custom fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByText('custom fallback')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})
