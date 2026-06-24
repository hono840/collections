/**
 * Supabase 生成型のプレースホルダ。
 * 本番スキーマ確定後に `pnpm supabase gen types typescript` で置き換える。
 * （Sprint 1 はローカルシードで動作。Supabase 配線は Sprint 3 breadth ETL 以降）
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
