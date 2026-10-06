// PLACEHOLDER (Sprint 0). Regenerate after the first migration (Sprint 1):
//   pnpm exec supabase gen types typescript --local > src/types/database.types.ts
// Kept minimal so the typed Supabase clients compile before any table exists.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: Record<never, never>
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
