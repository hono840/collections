/**
 * Domain barrel — the pure calculation core (architecture §5). React/localStorage-free.
 * schema.ts is the type-contract single source of truth; everything else derives from it.
 */
export * from './schema'
export * from './units'
export * from './tax'
export * from './rounding'
export * from './cost'
export * from './simulation'
export * from './alert'
export * from './selectors'
