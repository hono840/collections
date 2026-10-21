/**
 * 一意 ID 生成（architecture §12.3）。crypto.randomUUID の薄いラッパ。
 * ブラウザ / Node 22 双方で標準提供される Web Crypto を用い、追加依存ゼロで衝突しない ID を得る。
 */
export function newId(): string {
  return crypto.randomUUID()
}
