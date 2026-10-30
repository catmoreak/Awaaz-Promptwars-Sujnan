export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, 'not_found', `${what} was not found`);
export const forbidden = () => new HttpError(403, 'forbidden', 'You do not have access to this resource');
export const unauthorized = () => new HttpError(401, 'unauthorized', 'Sign in to continue');
export const badRequest = (code: string, message: string) => new HttpError(400, code, message);
export const unavailable = (code: string, message: string) => new HttpError(503, code, message);
