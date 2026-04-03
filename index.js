require("dotenv").config();
const { LavalinkManager } = require("lavalink-client");
const { Client, Collection, GatewayIntentBits, ActivityType, EmbedBuilder, MessageFlags, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const { loadCommands } = require("./utils/loadCommands.js");
const { logger } = require("./utils/logger.js");
const { buildNpComponents, buildDisabledNpComponents } = require("./utils/npButtonUtils.js");
const { startTimer, clearTimer, INACTIVITY_MS } = require("./utils/inactivityTimer.js");
const { buildNpImageCard } = require("./utils/npImageCard.js");
const RecentTrack = require("./utils/database/musicDb.js");

const COLORS = {
    ERROR: "FF0000",
    SUCCESS: "50C878",
    DEFAULT: "FF7F50",
};

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", error);
});

process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Promise Rejection", reason);
});

console.log(`
  ██████╗ ██████╗ ███████╗ █████╗ ███╗   ███╗ █████╗ 
  ██╔══██╗██╔══██╗██╔════╝██╔══██╗████╗ ████║██╔══██╗
  ██║  ██║██████╔╝█████╗  ███████║██╔████╔██║███████║
  ██║  ██║██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║██╔══██║
  ██████╔╝██║  ██║███████╗██║  ██║██║ ╚═╝ ██║██║  ██║
  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝
`);
console.log(`[Bot] ‼️ Music And Database Is Initializing... Please wait!`);
console.log(`[Info] ‼️ Created By: zBlueOrangePie. Github ---> https://github.com/zBlueOrangePie/Dreama-Discord-MusicBot`);
console.log(`[Warning] ⚠️ You cannot claim that you own this code!!`);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log(`[Database] ✅ Connected to MongoDB`))
    .catch((err) => logger.error("[Database] ❌ Failed to connect to MongoDB", err));

async function getChannel(channelId) {
    if (!channelId) return null;
    return client.channels.cache.get(channelId)
        ?? await client.channels.fetch(channelId).catch(() => null);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers, // Required for guildMemberAdd to fire.
        GatewayIntentBits.MessageContent, // Must also enable "Server Members Intent" in the Discord Developer Portal.
    ],
});

client.commands = new Collection();
loadCommands(client, path.join(__dirname, "commands"));

client.events = new Collection();

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.lavalink = new LavalinkManager({
    nodes: [
        {
            authorization: process.env.LAVA_PASS,
            host: process.env.LAVA_HOST,
            port: Number(process.env.LAVA_PORT),
            secure: process.env.LAVA_SECURE === "true",
            id: "Dreama Node",
        },
    ],
    sendToShard: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    },
    autoSkip: true,
    playerOptions: {
        defaultSearchPlatform: "ytmsearch", //Can be ytsearch and scsearch
        defaultVolume: 100,
        clientBasedPositionUpdateInterval: 50,
        applyVolumeAsFilter: false,
        volumeDecrementer: 1,
        useUnresolvedData: true,
        onDisconnect: {
            autoReconnect: true,
            destroyPlayer: false,
        },
    },
    client: {
        id: process.env.CLIENT_ID,
        username: process.env.USERNAME || "Dreama",
    },
});

client.on("raw", (d) => client.lavalink.sendRawData(d));

client.lavalink.nodeManager.on("connect", (node) => {
    console.log(`[Node] ✅ Node "${node.id}" is connected!`);
});

client.lavalink.nodeManager.on("disconnect", (node, reason) => {
    console.log(`[Node] 🔴 Node "${node.id}" disconnected. Reason: ${reason}`);
});

client.lavalink.nodeManager.on("reconnecting", (node) => {
    console.log(`[Node] 🔄 Node "${node.id}" is reconnecting...`);
});

client.lavalink.nodeManager.on("error", (node, error) => {
    logger.error(`[Node] ‼️ Node "${node.id}" encountered an error`, error);
});

client.lavalink.on("playerCreate", (player) => {
    console.log(`[Events] ✅ Event "playerCreate" fired for guild ${player.guildId}`);
});

client.lavalink.on("playerDestroy", (player, reason) => {
    console.log(`[Events] 🔴 Event "playerDestroy" fired for guild ${player.guildId}. Reason: ${reason}`);
    clearTimer(player.guildId);
});

client.lavalink.on("playerMove", async (player, oldChannelId, newChannelId) => {
    console.log(`[Events] 🔄 Event "playerMove" fired — moved from ${oldChannelId} to ${newChannelId}`);

    const channel = await getChannel(player.textChannelId);
    if (!channel) return;

    const footer = process.env.FOOTER || "Dreama";

    channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.DEFAULT)
                .setTitle("🔄 Moved Voice Channel")
                .setDescription(`The bot was moved to <#${newChannelId}>.`)
                .setFooter({ text: footer })
                .setTimestamp(),
        ],
    }).catch((err) => logger.error("Failed to send playerMove embed", err));
});

client.lavalink.on("playerDisconnect", async (player, voiceChannelId) => {
    console.log(`[Events] 🔴 Event "playerDisconnect" fired for guild ${player.guildId}`);

    const channel = await getChannel(player.textChannelId);
    if (!channel) return;

    const footer = process.env.FOOTER || "Dreama";

    channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle("🔌 Disconnected")
                .setDescription(`Disconnected from <#${voiceChannelId}>.`)
                .setFooter({ text: footer })
                .setTimestamp(),
        ],
    }).catch((err) => logger.error("Failed to send playerDisconnect embed", err));
});


// ── Track events ─────────────────────────────────────────────────────────────

client.lavalink.on("trackStart", async (player, track) => {
    console.log(`[Events] ✅ Event "trackStart" fired for: ${track.info.title}`);

    clearTimer(player.guildId);

    RecentTrack.create({
        guildId: player.guildId,
        title: track.info.title,
        uri: track.info.uri,
        author: track.info.author || "Unknown",
        duration: track.info.duration || 0,
        sourceName: track.info.sourceName || "unknown",
        artworkUrl: track.info.artworkUrl || null,
        requestedBy: track.requester?.username ?? "Unknown",
    }).catch((err) => logger.error("Failed to save recent track to database", err));

    // Disable the previous NP message if it still exists
    if (player.npMessage) {
        player.npMessage.edit({
            components: buildDisabledNpComponents({ npTrack: player.npTrack, npClient: client }),
            flags: MessageFlags.IsComponentsV2,
        }).catch(() => null);
        player.npMessage = null;
    }

    player.npTrack = track;
    player.npClient = client;

    const channel = await getChannel(player.textChannelId);

    if (!channel) {
        console.log(`[Events] 🔴 Event "trackStart" — channel ${player.textChannelId} not found`);
        return;
    }

    // Send the image card first, outside of the embed so it doesn't get
    // squished or hidden by Discord's embed rendering.
    try {
        const imageBuffer = await buildNpImageCard(track);
        const attachment  = new AttachmentBuilder(imageBuffer, { name: "nowplaying.png" });
        await channel.send({ files: [attachment] });
    } catch (err) {
        logger.error("Failed to send trackStart image card", err);
    }

    const npMessage = await channel.send({
        components: buildNpComponents(player, track, client),
        flags: MessageFlags.IsComponentsV2,
    }).catch((err) => {
        logger.error("Failed to send trackStart NP container", err);
        return null;
    });

    if (npMessage) player.npMessage = npMessage;
});

client.lavalink.on("trackEnd", async (player) => {
    console.log(`[Events] ✅ Event "trackEnd" fired`);

    if (player.npMessage) {
        player.npMessage.edit({
            components: buildDisabledNpComponents({ npTrack: player.npTrack, npClient: client }),
            flags: MessageFlags.IsComponentsV2,
        }).catch(() => null);
        player.npMessage = null;
    }
});

client.lavalink.on("trackStuck", async (player, track) => {
    console.log(`[Events] ⚠️ Event "trackStuck" fired for: ${track.info.title}`);

    const channel = await getChannel(player.textChannelId);
    if (!channel) return;

    const footer = process.env.FOOTER || "Dreama";

    channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle("⚠️ Track Stuck")
                .setDescription(`**[${track.info.title}](${track.info.uri})** got stuck and was skipped.`)
                .setFooter({ text: footer })
                .setTimestamp(),
        ],
    }).catch((err) => logger.error("Failed to send trackStuck embed", err));
});

client.lavalink.on("trackError", async (player, track, payload) => {
    console.log(`[Events] 🔴 Event "trackError" fired for: ${track.info.title}`);

    const channel = await getChannel(player.textChannelId);
    if (!channel) return;

    const footer = process.env.FOOTER || "Dreama";
    const sourceName = track.info.sourceName ?? "unknown";

    const pluginRequiredSources = ["deezer", "applemusic", "tidal", "spotify"];
    const isUnsupportedSource = pluginRequiredSources.includes(sourceName.toLowerCase());

    const description = isUnsupportedSource
        ? `**[${track.info.title}](${track.info.uri})** could not be streamed.\n\n**${sourceName.charAt(0).toUpperCase() + sourceName.slice(1)}** requires a Lavalink source plugin. Please contact your bot administrator.`
        : `An error occurred while playing **[${track.info.title}](${track.info.uri})** and it was skipped.`;

    channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle("❌ Track Error")
                .setDescription(description)
                .setFooter({ text: footer })
                .setTimestamp(),
        ],
    }).catch((err) => logger.error("Failed to send trackError embed", err));
});

client.lavalink.on("queueEnd", async (player) => {
    console.log(`[Events] ✅ Event "queueEnd" fired`);

    if (player.get("manualStop")) {
        player.set("manualStop", false);
        return;
    }

    if (player.npMessage) {
        player.npMessage.edit({
            components: buildDisabledNpComponents({ npTrack: player.npTrack, npClient: client }),
            flags: MessageFlags.IsComponentsV2,
        }).catch(() => null);
        player.npMessage = null;
    }

    const channel = await getChannel(player.textChannelId);
    const footer = process.env.FOOTER || "Dreama";
    const autoplay = player.get("autoplay") ?? false;

    if (autoplay) {
        const lastTrack = player.queue.previous?.[0];

        if (lastTrack) {
            const result = await player.search(
                { query: `${lastTrack.info.title} ${lastTrack.info.author}`, source: "ytmsearch" },
                client.user,
            ).catch(() => null);

            const recommendation = result?.tracks?.find(t => t.info.uri !== lastTrack.info.uri);

            if (recommendation) {
                await player.queue.add(recommendation);
                await player.play();
                return;
            }
        }
    }

    if (!channel) {
        console.log(`[Events] 🔴 Event "queueEnd" — channel ${player.textChannelId} not found`);
        return;
    }

    const minutesLeft = Math.round(INACTIVITY_MS / 1000 / 60);

    channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.DEFAULT)
                .setTitle("📭 Queue Ended")
                .setDescription(
                    `The queue has run out of songs. Add more with \`/play\`!\n\n` +
                    `⏳ I will leave the voice channel in **${minutesLeft} minutes** if no song is played.`
                )
                .setFooter({ text: footer })
                .setTimestamp(),
        ],
    }).catch((err) => logger.error("Failed to send queueEnd embed", err));

    startTimer(player.guildId, async () => {
        console.log(`[Inactivity] ⏳ Guild ${player.guildId} timed out — destroying player`);

        const activeChannel = await getChannel(player.textChannelId);

        if (activeChannel) {
            activeChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.DEFAULT)
                        .setTitle("👋 Leaving Due to Inactivity")
                        .setDescription(`No song was played for **${minutesLeft} minutes**. Goodbye!`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            }).catch((err) => logger.error("Failed to send inactivity leave embed", err));
        }

        await player.destroy();
    });
});

client.once("clientReady", () => {
    console.log(`[Initializer] Initializing command(s) & event(s)...`);
    console.log(`[Initializer] ✅ Successfully Initialized`);
    console.log(`[Bot] ✅ Logged in as ${client.user.tag}!`);
    console.log(`[Bot] ✅ Now watching ${client.guilds.cache.size} server(s)!`);
    console.log(`[Bot] ✅ Watching ${client.users.cache.size} user(s)!`);

    client.user.setPresence({
        activities: [{
            name: "/help | Dreama",
            type: ActivityType.Watching,
        }],
        status: "online",
    });

    client.lavalink.init({ ...client.user });
});

client.login(process.env.TOKEN);
