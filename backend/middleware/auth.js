const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const s = process.env.JWT_SECRETKEY || process.env.JWT_SECRET;
  if (!s) {
    throw new Error("JWT_SECRETKEY (or JWT_SECRET) is not set in backend/.env");
  }
  return s;
}

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

function signToken(user) {
  const secret = getJwtSecret();
  return jwt.sign(
    { userId: user._id.toString(), email: user.email },
    secret,
    { expiresIn: "7d" }
  );
}

module.exports = { requireAuth, signToken, getJwtSecret };
