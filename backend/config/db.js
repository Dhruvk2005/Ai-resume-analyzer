const mongoose = require("mongoose");

const mongooseOptions = {
  serverSelectionTimeoutMS: 10_000,
  family: 4,
};

function getMongoUri() {
  return process.env.MONGODB_URI || process.env.MONGO_URL;
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

async function connectDB() {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error(
      "MONGODB_URI (or MONGO_URL) is not set in backend/.env"
    );
  }
  if (isConnected()) {
    return;
  }
  await mongoose.connect(uri, mongooseOptions);
  console.log("MongoDB connected");
}

/**
 * Retries in the background so the HTTP server can start even when DNS/network blocks Atlas SRV.
 */
function startMongoRetries() {
  const delayMs = Number(process.env.MONGODB_RETRY_MS) || 15_000;

  const tick = async () => {
    if (isConnected()) {
      return;
    }
    try {
      await connectDB();
    } catch (err) {
      const msg = err?.message || String(err);
      console.error("[MongoDB]", msg);
      if (/querySrv|ENOTFOUND|getaddrinfo/i.test(msg)) {
        console.error(
          "[MongoDB] DNS could not resolve Atlas (SRV). Try: different network/VPN/DNS (e.g. 8.8.8.8), or in Atlas use the non-SRV / standard connection string."
        );
      }
      setTimeout(tick, delayMs);
    }
  };

  void tick();
}

module.exports = { connectDB, getMongoUri, isConnected, startMongoRetries };
