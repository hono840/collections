export type ActionErrorCode =
  | 'unauthorized'
  | 'validation'
  | 'not_found'
  | 'photo_limit_exceeded'
  | 'limit_exceeded'
  | 'rate_limited'
  | 'conflict'
  | 'unexpected'

export type ActionWarning = 'storage_cleanup_pending'

export type FieldErrors = Partial<Record<string, string[]>>

export type ActionError = {
  code: ActionErrorCode
  message: string
  fieldErrors?: FieldErrors
}

export type ActionResult<TData = undefined> =
  | { ok: true; data: TData; warning?: ActionWarning }
  | { ok: false; error: ActionError }

export function actionOk<TData>(data: TData, warning?: ActionWarning): ActionResult<TData> {
  return { ok: true, data, ...(warning ? { warning } : {}) }
}

export function actionError(
  code: ActionErrorCode,
  message: string,
  fieldErrors?: FieldErrors,
): ActionResult<never> {
  return { ok: false, error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } }
}
