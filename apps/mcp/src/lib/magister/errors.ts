export class MagisterConnectionError extends Error {
  constructor(
    public readonly code:
      | "MAGISTER_NOT_CONNECTED"
      | "MAGISTER_AUTH_EXPIRED"
      | "INVALID_ARGUMENT"
      | "MAGISTER_HTTP_ERROR"
      | "INTERNAL_ERROR",
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "MagisterConnectionError";
  }
}
