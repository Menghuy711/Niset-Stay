import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { settings } from './config.js';

export const hashPassword = (password) => bcrypt.hashSync(password, 12);

export const verifyPassword = (plainPassword, hashedPassword) =>
  bcrypt.compareSync(plainPassword, hashedPassword);

export const createAccessToken = (data, expiresDeltaMinutes) =>
  jwt.sign(data, settings.jwt.secretKey, {
    algorithm: settings.jwt.algorithm,
    expiresIn: Math.floor((expiresDeltaMinutes ?? settings.jwt.accessTokenExpireMinutes) * 60),
  });

/** Returns the JWT payload, or null if invalid / expired / wrong purpose. */
export const verifyToken = (token, expectedPurpose) => {
  try {
    const payload = jwt.verify(token, settings.jwt.secretKey, {
      algorithms: [settings.jwt.algorithm],
    });
    if (expectedPurpose && payload.purpose !== expectedPurpose) return null;
    return payload;
  } catch {
    return null;
  }
};