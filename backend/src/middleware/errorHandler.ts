import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    res.status(400).json({ success: false, message: errors[0]?.message ?? 'Invalid input', errors });
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ success: false, message: err.message, details: err.details });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, message: `Invalid ${err.path}` });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    res.status(400).json({ success: false, message: errors[0]?.message ?? 'Invalid input', errors });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(400).json({ success: false, message: err.message });
    return;
  }
  if (typeof err === 'object' && err && 'type' in err && (err as { type: string }).type === 'entity.too.large') {
    res.status(413).json({ success: false, message: 'Request is too large' });
    return;
  }
  if (typeof err === 'object' && err && 'type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    res.status(400).json({ success: false, message: 'Malformed JSON body' });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again.',
    ...(env.NODE_ENV !== 'production' && err instanceof Error ? { stack: err.stack } : {}),
  });
}
