import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { UserModel } from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export async function ensureAdminUser(): Promise<void> {
  if ((await UserModel.estimatedDocumentCount()) > 0) return;
  await UserModel.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
    role: 'admin',
  });
  console.log(`Created admin user ${env.ADMIN_EMAIL}. Change the password after first login.`);
}

function signToken(user: { id: string; email: string; role: string }) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export async function login(email: string, password: string) {
  const user = await UserModel.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, 'Incorrect email or password');
  }
  return { token: signToken({ id: user.id, email: user.email, role: user.role }), user: user.toJSON() };
}

export async function getUser(id: string) {
  const user = await UserModel.findById(id);
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  return user;
}

export async function changePassword(id: string, currentPassword: string, newPassword: string) {
  const user = await UserModel.findById(id).select('+passwordHash');
  if (!user) throw ApiError.unauthorized();
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
}
