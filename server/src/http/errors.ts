/** Application-level HTTP error with a status code and optional details. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message = 'Bad request', details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }
  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, message);
  }
  static conflict(message = 'Conflict'): ApiError {
    return new ApiError(409, message);
  }
}
