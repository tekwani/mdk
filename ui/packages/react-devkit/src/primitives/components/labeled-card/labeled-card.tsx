import _isString from 'lodash/isString'
import _get from 'lodash/get'
import _compact from 'lodash/compact'

import { cn } from '../../utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'
import { forwardRef, type ReactNode } from 'react'

export type LabeledCardNavigateOptions = Partial<{
  href: string
  target: string
}>

export type LabeledCardProps = Partial<{
  /**
   * Applies a dark background modifier
   * @default false
   */
  isDark: boolean
  /** Additional class for the root element */
  className: string
  /**
   * Prevents content from wrapping
   * @default false
   */
  hasNoWrap: boolean
  /**
   * Sets `position: relative` on the container
   * @default false
   */
  isRelative: boolean
  /**
   * Stretches the card to full container width
   * @default false
   */
  isFullWidth: boolean
  /**
   * Removes default margin
   * @default false
   */
  hasNoMargin: boolean
  /**
   * Removes the card border
   * @default false
   */
  hasNoBorder: boolean
  /**
   * Stretches the card to full container height
   * @default false
   */
  isFullHeight: boolean
  /**
   * Enables vertical scroll on the card body
   * @default false
   */
  isScrollable: boolean
  /** Header content shown above the card body */
  label: ReactNode
  /** Card body content */
  children: ReactNode
  /** Returns a link `href`/`target` for the label when provided */
  getNavigateOptions: (label: string) => LabeledCardNavigateOptions
  /** Tooltip shown when hovering the label, e.g. to explain what a count includes */
  labelTooltip: ReactNode
}>

const BASE_CLASS = 'mdk-labeled-card'

/**
 * Card variant that pairs a tiny label above the body — used for compact stat or metadata blocks.
 *
 * @category layout
 * @domain generic
 * @tier agent-ready
 */
export const LabeledCard = forwardRef<HTMLDivElement, LabeledCardProps>((props, ref) => {
  const {
    label,
    isDark,
    children,
    className,
    hasNoWrap,
    isRelative,
    hasNoBorder,
    hasNoMargin,
    isFullWidth,
    isFullHeight,
    isScrollable,
    getNavigateOptions,
    labelTooltip,
  } = props

  const labelText = _isString(label) ? label : ''
  const navOptions = getNavigateOptions?.(labelText)

  const containerClasses = cn(
    BASE_CLASS,
    _compact([
      isFullWidth && `${BASE_CLASS}--full-width`,
      isFullHeight && `${BASE_CLASS}--full-height`,
      isDark && `${BASE_CLASS}--dark`,
      hasNoWrap && `${BASE_CLASS}--no-wrap`,
      hasNoMargin && `${BASE_CLASS}--no-margin`,
      hasNoBorder && `${BASE_CLASS}--no-border`,
      isScrollable && `${BASE_CLASS}--scrollable`,
      isRelative && `${BASE_CLASS}--relative`,
    ]),
    className,
  )

  const titleElement = <div className={`${BASE_CLASS}__title`}>{label}</div>

  const titleWithTooltip = labelTooltip ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{titleElement}</TooltipTrigger>
        <TooltipContent>{labelTooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    titleElement
  )

  const href = _get(navOptions, 'href')
  const target = _get(navOptions, 'target')

  const content = href ? (
    <a href={href} target={target} className={`${BASE_CLASS}__link`}>
      {titleWithTooltip}
    </a>
  ) : (
    titleWithTooltip
  )

  return (
    <div ref={ref} className={containerClasses}>
      <div className={`${BASE_CLASS}__header`}>{content}</div>
      <div className={`${BASE_CLASS}__body`}>{children}</div>
    </div>
  )
})

LabeledCard.displayName = 'LabeledCard'
