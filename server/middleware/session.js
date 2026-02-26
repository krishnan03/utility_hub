import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';

const COOKIE_NAME = 'session_id';

/**
 * Session middleware that assigns a UUID session ID to each visitor.
 * - Checks for an existing `session_id` cookie
 * - If absent, generates a new UUID and sets it as an httpOnly cookie
 * - Attaches the session ID to `req.sessionId` for downstream use
 */
export function sessionMiddleware(req, res, next) {
  let sessionId = req.cookies?.[COOKIE_NAME];

  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie(COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: 'strict',
      secure: config.nodeEnv === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  req.sessionId = sessionId;
  next();
}

export default sessionMiddleware;
