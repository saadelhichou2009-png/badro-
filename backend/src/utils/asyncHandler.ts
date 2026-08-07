import { NextFunction, Request, Response } from 'express';

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * يلتقط أي خطأ يحدث داخل controller غير متزامن ويمرره إلى errorHandler
 * بدلاً من تكرار try/catch في كل مكان.
 */
export function asyncHandler(fn: AsyncFn) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
