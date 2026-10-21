'use client'

/**
 * Convenience re-export (architecture §2 tree). The provider owns the Context + actions;
 * consumers import the hook and input types from here.
 */
export {
  useAppState,
  AppStateProvider,
  type AppStateValue,
  type AppStateActions,
  type IngredientInput,
  type MenuInput,
} from '@/lib/state/AppStateProvider'
