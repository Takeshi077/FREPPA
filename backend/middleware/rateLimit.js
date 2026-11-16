const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attempts = new Map();

function keyFor(req) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  return `${req.ip || req.socket?.remoteAddress || 'unknown'}|${email}`;
}

function prune(now) {
  for (const [key, rec] of attempts) {
    if (rec.blockedUntil <= now && now - rec.firstAttempt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}

exports.loginLimiter = (req, res, next) => {
  const now = Date.now();
  const rec = attempts.get(keyFor(req));
  if (rec && rec.blockedUntil > now) {
    const seconds = Math.ceil((rec.blockedUntil - now) / 1000);
    res.set('Retry-After', String(seconds));
    return res.status(429).json({
      error: `Too many failed login attempts. Try again in ${Math.ceil(seconds / 60)} minute(s).`
    });
  }
  next();
};

exports.recordFailedLogin = (req) => {
  const now = Date.now();
  const key = keyFor(req);
  const rec = attempts.get(key);

  if (!rec || now - rec.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now, blockedUntil: 0 });
    return;
  }

  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.blockedUntil = now + WINDOW_MS;
  }
};

exports.clearLoginAttempts = (req) => {
  attempts.delete(keyFor(req));
};

const cleanup = setInterval(() => prune(Date.now()), 10 * 60 * 1000);
if (cleanup.unref) cleanup.unref();
