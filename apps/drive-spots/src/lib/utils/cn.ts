/**
 * Joins class names and drops falsy entries. It does not merge conflicting Tailwind classes
 * (no tailwind-merge dependency), so components must not pass two values for the same property.
 */
export function cn(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}
