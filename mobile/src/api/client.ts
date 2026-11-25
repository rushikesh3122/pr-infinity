/** Turns any thrown error into a sentence a business user can act on. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}

/** Field-level errors (none in offline mode; validation errors arrive as messages). */
export function getFieldErrors(_error: unknown): Record<string, string> {
  return {};
}
