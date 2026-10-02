/*
 * Errors whose message is safe to show to visitors ("That player already
 * has an account"). Anything else (database errors and the like) is logged
 * on the server and replaced by a general message, so internal details
 * never reach the browser.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

/* The message to send back: the real one for UserFacingError, otherwise
   `fallback`. */
export function publicMessage(error: unknown, fallback: string) {
  return error instanceof UserFacingError ? error.message : fallback;
}

/* A request's JSON body, or {} if it's missing or not valid JSON. */
export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();

    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/* A text field from a JSON body ("" when missing or not text). */
export function textField(body: Record<string, unknown>, name: string) {
  const value = body[name];
  return typeof value === "string" ? value : "";
}
