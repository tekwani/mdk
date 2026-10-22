import _capitalize from 'lodash/capitalize'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'
import _slice from 'lodash/slice'
import _split from 'lodash/split'
import _toLower from 'lodash/toLower'
import _toUpper from 'lodash/toUpper'
import {
  COMPLETE_CONTAINER_TYPE,
  CONTAINER_MODEL,
  CONTAINER_TYPE,
  CONTAINER_TYPE_NAME_MAP,
  MAINTENANCE_CONTAINER,
} from '../constants/container-constants'
import { separateByHyphenRegExp, separateByTwoHyphensRegExp } from './device-utils'
const isBitdeer = (type: string | undefined): boolean =>
  _includes(_toLower(type), CONTAINER_TYPE.BITDEER) ||
  _includes(_toLower(type), CONTAINER_MODEL.BITDEER)
const isMicroBT = (type: string | undefined): boolean =>
  _includes(_toLower(type), CONTAINER_TYPE.MICROBT) ||
  _includes(_toLower(type), CONTAINER_MODEL.MICROBT)
export const getContainerName = (container: string | undefined, type?: string): string => {
  if (_isEmpty(container)) {
    return ''
  }
  if (container === MAINTENANCE_CONTAINER) {
    return 'Maintenance'
  }
  const isBitdeerContainer = isBitdeer(container) || isBitdeer(type)
  const isMicroBTContainer = isMicroBT(container) || isMicroBT(type)

  if (isBitdeerContainer || isMicroBTContainer) {
    const [name, id] = _slice((container || '').match(separateByHyphenRegExp) || [], 1)
    const containerName = `${_capitalize(name)} ${id}`
    if (!type) {
      return containerName
    }
    const [, containerModel] = _slice((type || '').match(separateByHyphenRegExp) || [], 1)
    if (isMicroBTContainer) {
      let typeKey

      if (_includes(COMPLETE_CONTAINER_TYPE.MICROBT_ALPHA, containerModel)) {
        typeKey = COMPLETE_CONTAINER_TYPE.MICROBT_ALPHA
      } else if (_includes(COMPLETE_CONTAINER_TYPE.MICROBT_BETA, containerModel)) {
        typeKey = COMPLETE_CONTAINER_TYPE.MICROBT_BETA
      }

      if (!typeKey) {
        return `MicroBT ${id}`
      }

      const [name, model] = _split(CONTAINER_TYPE_NAME_MAP[typeKey], ' ')
      return `${name} ${id} ${model}`
    }
    // Bitdeer labels
    return `${containerName} ${_toUpper(containerModel)}`
  }
  const twoHyphenMatch = (container || '').match(separateByTwoHyphensRegExp)
  if (twoHyphenMatch) {
    const [name, model, id] = _slice(twoHyphenMatch, 1)
    return `${_capitalize(name)} ${_capitalize(model)} ${id}`
  }

  const singleHyphenMatch = (container || '').match(separateByHyphenRegExp)
  if (singleHyphenMatch) {
    const [name, id] = _slice(singleHyphenMatch, 1)
    return `${_capitalize(name)} ${id}`
  }

  return _capitalize(container)
}
