export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, 400, details);
  }
  static unauthorized(message = 'غير مصرح لك بالوصول') {
    return new AppError(message, 401);
  }
  static forbidden(message = 'ممنوع الوصول لهذا المورد') {
    return new AppError(message, 403);
  }
  static notFound(message = 'العنصر المطلوب غير موجود') {
    return new AppError(message, 404);
  }
  static conflict(message: string) {
    return new AppError(message, 409);
  }
  static tooManyRequests(message = 'عدد كبير جداً من الطلبات، حاول لاحقاً') {
    return new AppError(message, 429);
  }
  static internal(message = 'حدث خطأ في الخادم') {
    return new AppError(message, 500);
  }
}
