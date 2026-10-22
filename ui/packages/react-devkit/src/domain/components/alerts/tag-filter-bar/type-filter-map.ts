import { COMPLETE_CONTAINER_TYPE, CONTAINER_TYPE_NAME_MAP } from '../../../constants/container-constants'
import {
  ALERT_TYPE_POOL_NAME,
  ALERT_TYPE_POOL_VALUE,
  CABINET_DEVICES_TYPES_NAME_MAP,
  COMPLETE_MINER_TYPES,
  LV_CABINET_DEVICES_TYPE,
  MINER_TYPE_NAME_MAP,
} from '../../../constants/device-constants'
import { CROSS_THING_TYPES } from '../../../constants/devices'

type FilterOption = {
  label: string
  value: string
}

type TypeFilter = {
  value: string
  label: string
  children: FilterOption[]
}

const getFilterOptions = (
  types: string[] | Record<string, string>,
  names: Record<string, string>,
): FilterOption[] => {
  const valuesList = Array.isArray(types) ? types : Object.values(types)

  return valuesList.map((value) => ({
    label: names[value] as string,
    value,
  }))
}

/**
 * Device-type options for the alerts tag filter: containers, miners, LV
 * cabinets and pools, each with its known types as children.
 */
export const TYPE_FILTER_MAP: Record<string, TypeFilter> = {
  CONTAINER: {
    value: CROSS_THING_TYPES.CONTAINER,
    label: 'Container',
    children: getFilterOptions(COMPLETE_CONTAINER_TYPE, CONTAINER_TYPE_NAME_MAP),
  },
  MINER: {
    value: CROSS_THING_TYPES.MINER,
    label: 'Miner',
    children: getFilterOptions(COMPLETE_MINER_TYPES, MINER_TYPE_NAME_MAP),
  },
  LV_CABINET: {
    value: CROSS_THING_TYPES.CABINET,
    label: 'LV cabinet',
    children: getFilterOptions(LV_CABINET_DEVICES_TYPE, CABINET_DEVICES_TYPES_NAME_MAP),
  },
  POOL: {
    value: CROSS_THING_TYPES.POOL,
    label: 'Pool',
    children: getFilterOptions(ALERT_TYPE_POOL_VALUE, ALERT_TYPE_POOL_NAME),
  },
}
