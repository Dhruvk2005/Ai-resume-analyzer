const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { isConnected } = require("../config/db");
const { signToken } = require("../middleware/auth");

const SALT_ROUNDS = 10;

function requireDb(res) {
  if (!isConnected()) {
    res.status(503).json({
      error:
        "Database is not connected. Check MongoDB and try again in a moment.",
    });
    return false;
  }
  return true;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

async function register(req, res) {
  try {
    if (!requireDb(res)) return;
    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: "Valid email is required." });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters.",
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ email, passwordHash, name });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    console.error(err);
    return res.status(500).json({ error: "Could not create account." });
  }
}

async function login(req, res) {
  try {
    if (!requireDb(res)) return;
    const email =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not sign in." });
  }
}

async function me(req, res) {
  try {
    if (!requireDb(res)) return;
    const user = await User.findById(req.userId).select("email name");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    return res.json({
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not load profile." });
  }
}

module.exports = { register, login, me };
