/** Errors with a stable `code` that the UI translates through the i18n dictionary. */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = new.target.name;
  }
}

export class ForbiddenError extends DomainError {
  constructor(readonly permission?: string) {
    super("FORBIDDEN", permission ? `Missing permission: ${permission}` : "Forbidden");
  }
}

export class UnauthenticatedError extends DomainError {
  constructor() {
    super("UNAUTHENTICATED", "Sign-in required");
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string) {
    super("NOT_FOUND", `${entity} not found`);
  }
}

export class OutOfStockError extends DomainError {
  constructor(readonly sku: string) {
    super("OUT_OF_STOCK", `Insufficient stock for ${sku}`);
  }
}

export class ConflictError extends DomainError {
  constructor(message = "The record was changed by someone else") {
    super("CONFLICT", message);
  }
}

export function errorCode(error: unknown): string {
  return error instanceof DomainError ? error.code : "UNKNOWN";
}
