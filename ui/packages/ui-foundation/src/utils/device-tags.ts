/**
 * Type-prefix predicates and tag helpers for MDK device types: a miner's
 * `type` starts with `miner-` (then the brand code), a container's with
 * `container-`, and a device's own search tag is `id-<deviceId>`. Owned by
 * ui-foundation so the React layers stay free of tag-string knowledge.
 */

import { MINER_TYPE } from '../constants/device-constants'

const MINER_PREFIX = 'miner-'
const CONTAINER_PREFIX = 'container-'
const ID_TAG_PREFIX = 'id-'

export const isMiner = (type: string | undefined): boolean =>
  typeof type === 'string' && type.startsWith(MINER_PREFIX)

export const isContainer = (type: string | undefined): boolean =>
  typeof type === 'string' && type.startsWith(CONTAINER_PREFIX)

export const isAvalon = (type: string | undefined): boolean =>
  isMiner(type) && (type ?? '').includes(MINER_TYPE.AVALON)

export const isWhatsminer = (type: string | undefined): boolean =>
  isMiner(type) && (type ?? '').includes(MINER_TYPE.WHATSMINER)

export const isAntminer = (type: string | undefined): boolean =>
  isMiner(type) && typeof type === 'string' && type.includes(MINER_TYPE.ANTMINER)

export const removeContainerPrefix = (text: string): string => text.replace(/^container-/, '')

export const appendContainerToTag = (deviceId: string): string => `${CONTAINER_PREFIX}${deviceId}`

export const appendIdToTag = (deviceId: string): string => `${ID_TAG_PREFIX}${deviceId}`

export const appendIdToTags = (deviceIdList: string[]): string[] =>
  deviceIdList.map((deviceId) => appendIdToTag(deviceId))
