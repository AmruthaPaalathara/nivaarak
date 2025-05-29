// server/config/redisConfig.js

const Redis = require("ioredis");
require("dotenv").config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  // reconnectStrategy: retry after a delay that grows with attempt count
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

redisClient.once("ready", () => {
  console.log("Redis is ready to use");
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

// Gracefully quit on various termination signals
["SIGINT", "SIGTERM", "SIGQUIT", "SIGUSR2"].forEach((sig) => {
  process.on(sig, () => {
    console.log(`Received ${sig}, shutting down Redis client...`);
    redisClient.quit(() => process.exit(0));
  });
});

module.exports = redisClient;
