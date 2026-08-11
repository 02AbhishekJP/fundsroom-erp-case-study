import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle PostgreSQL unique constraint violations
  if ((err as any).code === '23505') {
    const detail = (err as any).detail || '';
    res.status(409).json({
      success: false,
      message: `Duplicate entry. ${detail}`,
    });
    return;
  }

  // Handle PostgreSQL check constraint violations
  if ((err as any).code === '23514') {
    res.status(400).json({
      success: false,
      message: 'Data validation failed. Check constraint violated.',
    });
    return;
  }

  // Handle PostgreSQL foreign key violations
  if ((err as any).code === '23503') {
    res.status(400).json({
      success: false,
      message: 'Referenced record not found.',
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
};
