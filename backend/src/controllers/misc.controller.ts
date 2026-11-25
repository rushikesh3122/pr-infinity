import type { Request, Response } from 'express';
import { getDashboard } from '../services/dashboard.service.js';
import { getSettings, updateSettings } from '../services/settings.service.js';
import * as auth from '../services/auth.service.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';
import { changePasswordSchema, loginSchema } from '../validators/auth.validator.js';
import { ok } from '../utils/respond.js';

export async function dashboard(_req: Request, res: Response) {
  ok(res, await getDashboard());
}

export async function readSettings(_req: Request, res: Response) {
  ok(res, await getSettings());
}

export async function writeSettings(req: Request, res: Response) {
  ok(res, await updateSettings(updateSettingsSchema.parse(req.body)));
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  ok(res, await auth.login(email, password));
}

export async function me(req: Request, res: Response) {
  ok(res, await auth.getUser(req.user!.sub));
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await auth.changePassword(req.user!.sub, currentPassword, newPassword);
  ok(res, { changed: true });
}
