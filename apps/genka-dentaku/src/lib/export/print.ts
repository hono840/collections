/**
 * PDF export via the browser print dialog (PRD 4.f — Pro). Zero dependencies: the printable
 * layout is @media print CSS on PrintableMenuReport / PrintableCostSheet; this just triggers print.
 */

/** Open the browser print dialog (no-op outside the browser). */
export function triggerPrint(): void {
  if (typeof window === 'undefined') return
  window.print()
}
