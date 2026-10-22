export const TIME_FORMAT = 'HH:mm'
export const DATE_FORMAT = 'dd-MM-yyyy'
export const DATE_TIME_FORMAT = `${DATE_FORMAT} ${TIME_FORMAT}`
export const DATE_TIME_FORMAT_WITH_SECONDS = `${DATE_TIME_FORMAT}:ss`

// Type exports
export type DateTimeFormatType = typeof DATE_TIME_FORMAT | typeof DATE_TIME_FORMAT_WITH_SECONDS
