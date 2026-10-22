/**
 * Runnable example for TimelineSelector.
 *
 * Controlled component — the caller owns its `value` and reacts to
 * `onChange`.
 */
import { TimelineSelector } from '@tetherto/mdk-react-devkit'
import { useState } from 'react'

export const TimelineSelectorExample = () => {
  const [value, setValue] = useState('5m')
  return <TimelineSelector value={value} onChange={setValue} />
}
