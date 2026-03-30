require("dotenv").config();
const { ShardingManager } = require("discord.js");
const { logger } = require("./utils/logger.js");

const manager = new ShardingManager("./index.js", {
    token: process.env.TOKEN,
    totalShards: "auto",
});

manager.on("shardCreate", (shard) => {
    console.log(`[Sharding] ✅ Shard #${shard.id} launched`);

    shard.on("ready", () => {
        console.log(`[Sharding] ✅ Shard #${shard.id} is ready`);
    });

    shard.on("disconnected", () => {
        console.log(`[Sharding] 🔴 Shard #${shard.id} disconnected`);
    });

    shard.on("reconnecting", () => {
        console.log(`[Sharding] 🔄 Shard #${shard.id} is reconnecting...`);
    });

    shard.on("error", (error) => {
        logger.error(`[Sharding] ‼️ Shard #${shard.id} encountered an error`, error);
    });
});

manager.spawn().catch((err) => {
    logger.error("[Sharding] Failed to spawn shards", err);
});
