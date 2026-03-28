require("dotenv").config();
const { rest } = require("./deploy-cmds.js");
const { LavalinkManager } = require("lavalink-client");
const { Client, Collection, GatewayIntentBits, ActivityType, EmbedBuilder, AttachmentBuilder, Events } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { loadCommands } = require("./utils/loadCommands.js");
const { logger } = require("./utils/logger.js");
const { formatDuration } = require("./utils/formatDuration.js");
const { buildNpRow, buildDisabledNpRow } = require("./utils/npButtonUtils.js");
const { startTimer, clearTimer, INACTIVITY_MS } = require("./utils/inactivityTimer.js");
const { buildNpImageCard } = require("./utils/npImageCard.js");

const COLORS = {
    ERROR: "FF0000",
    SUCCESS: "50C878",
    DEFAULT: "5865F2",
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
console.log(`[Bot] ‼️ Music Is Loading... Please wait!`);
console.log(`[Info] ‼️ Created By: zBlueOrangePie. Github ---> https://github.com/zBlueOrangePie/Dreama-Discord-MusicBot`);
console.log(`[Warning] ⚠️ You cannot claim that you own this code!!`);

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
        GatewayIntentBits.MessageContent,
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
            id: "Main Node",
        },
    ],
    sendToShard: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    },
    autoSkip: true,
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

    const moveEmbed = new EmbedBuilder()
        .setColor(COLORS.DEFAULT)
        .setTitle("🔄 Moved Voice Channel")
        .setDescription(`The bot was moved to <#${newChannelId}>.`)
        .setFooter({ text: footer })
        .setTimestamp();

    channel.send({ embeds: [moveEmbed] }).catch((err) => {
        logger.error("Failed to send playerMove embed", err);
    });
});

client.lavalink.on("playerDisconnect", async (player, voiceChannelId) => {
    console.log(`[Events] 🔴 Event "playerDisconnect" fired for guild ${player.guildId}`);

    const channel = await getChannel(player.textChannelId);
    if (!channel) return;

    const footer = process.env.FOOTER || "Dreama";

    const disconnectEmbed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle("🔌 Disconnected")
        .setDescription(`Disconnected from <#${voiceChannelId}>.`)
        .setFooter({ text: footer })
        .setTimestamp();

    channel.send({ embeds: [disconnectEmbed] }).catch((err) => {
        logger.error("Failed to send playerDisconnect embed", err);
    });
});


client.lavalink.on("trackStart", async (player, track) => {
    console.log(`[Events] ✅ Event "trackStart" fired for: ${track.info.title}`);

    clearTimer(player.guildId);

    if (player.npMessage) {
        player.npMessage.edit({ components: [buildDisabledNpRow()] }).catch(() => null);
        player.npMessage = null;
    }

    const channel = await getChannel(player.textChannelId);

    if (!channel) {
        console.log(`[Events] 🔴 Event "trackStart" — channel ${player.textChannelId} not found`);
        return;
    }

    const footer = process.env.FOOTER || "Dreama";
    const autoplay = player.get("autoplay") ?? false;

    const imageBuffer = await buildNpImageCard(track).catch(() => null);
    const imageAttachment = imageBuffer ? new AttachmentBuilder(imageBuffer, { name: "nowplaying.png" }) : null;

    const startEmbed = new EmbedBuilder()
        .setColor(COLORS.DEFAULT)
        .setTitle("🎵 Now Playing")
        .setDescription(`**[${track.info.title}](${track.info.uri})**\nUse \`/play\` again to add more songs to the queue!`)
        .addFields(
            { 
                name: "Author",       
                value: track.info.author,                      
                inline: true 
            },
            { 
                name: "Requested By", 
                value: track.requester?.username ?? "Unknown",  
                inline: true 
            },
            { 
                name: "Duration",     
                value: formatDuration(track.info.duration),     
                inline: true 
            },
            { 
                name: "Autoplay",     
                value: autoplay ? "🔀 On" : "Off",             
                inline: true 
            },
        )
        .setFooter({ text: footer })
        .setTimestamp();

    if (imageAttachment) {
        startEmbed.setImage("attachment://nowplaying.png");
    } else {
        const artworkUrl = typeof track.info.artworkUrl === "string" && track.info.artworkUrl.startsWith("http")
            ? track.info.artworkUrl
            : null;
        if (artworkUrl) startEmbed.setThumbnail(artworkUrl);
    }

    const row = buildNpRow(player);

    const sendOptions = {
        embeds     : [startEmbed],
        components : [row],
    };

    if (imageAttachment) sendOptions.files = [imageAttachment];

    const npMessage = await channel.send(sendOptions).catch((err) => {
        logger.error("Failed to send trackStart embed", err);
        return null;
    });

    if (npMessage) player.npMessage = npMessage;
});

client.lavalink.on("trackEnd", async (player) => {
    console.log(`[Events] ✅ Event "trackEnd" fired`);

    if (player.npMessage) {
        player.npMessage.edit({ components: [buildDisabledNpRow()] }).catch(() => null);
        player.npMessage = null;
    }
});

client.lavalink.on("trackStuck", async (player, track) => {
    console.log(`[Events] ⚠️ Event "trackStuck" fired for: ${track.info.title}`);

    const channel = await getChannel(player.textChannelId);
    if (!channel) return;

    const footer = process.env.FOOTER || "Dreama";

    const stuckEmbed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle("⚠️ Track Stuck")
        .setDescription(`**[${track.info.title}](${track.info.uri})** got stuck and was skipped.`)
        .setFooter({ text: footer })
        .setTimestamp();

    channel.send({ embeds: [stuckEmbed] }).catch((err) => {
        logger.error("Failed to send trackStuck embed", err);
    });
});

client.lavalink.on("trackError", async (player, track, payload) => {
    console.log(`[Events] 🔴 Event "trackError" fired for: ${track.info.title}`);

    const channel = await getChannel(player.textChannelId);
    if (!channel) return;

    const footer = process.env.FOOTER || "Dreama";

    const errorEmbed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle("❌ Track Error")
        .setDescription(`An error occurred while playing **[${track.info.title}](${track.info.uri})** and it was skipped.`)
        .setFooter({ text: footer })
        .setTimestamp();

    channel.send({ embeds: [errorEmbed] }).catch((err) => {
        logger.error("Failed to send trackError embed", err);
    });
});

client.lavalink.on("queueEnd", async (player) => {
    console.log(`[Events] ✅ Event "queueEnd" fired`);

    if (player.npMessage) {
        player.npMessage.edit({ components: [buildDisabledNpRow()] }).catch(() => null);
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

            const recommendation = result?.tracks?.find(
                (t) => t.info.uri !== lastTrack.info.uri
            );

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

    const queueEndEmbed = new EmbedBuilder()
        .setColor(COLORS.DEFAULT)
        .setTitle("📭 Queue Ended")
        .setDescription(`The queue is now empty. Add more songs with \`/play\`!\n\n⏳ I will leave the voice channel in **${minutesLeft} minutes** if no song is played.`)
        .setFooter({ text: footer })
        .setTimestamp();

    channel.send({ embeds: [queueEndEmbed] }).catch((err) => {
        logger.error("Failed to send queueEnd embed", err);
    });

    startTimer(player.guildId, async () => {
        console.log(`[Inactivity] ⏳ Guild ${player.guildId} timed out — destroying player`);

        const activeChannel = await getChannel(player.textChannelId);

        if (activeChannel) {
            const leaveEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle("👋 Leaving Due to Inactivity")
                .setDescription(`No song was played for **${minutesLeft} minutes**. Goodbye!`)
                .setFooter({ text: footer })
                .setTimestamp();

            activeChannel.send({ embeds: [leaveEmbed] }).catch((err) => {
                logger.error("Failed to send inactivity leave embed", err);
            });
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
    console.log(`[Info] 🚀 Also Checkout My Discord Bot - TicketByte!!! https://ticketbyte.bot.nu/`);
    console.log(`[Info] 💪 Big Thanks also to orange0990 for helping me create this!`);

    client.user.setPresence({
        activities: [{ 
            name: "/help | Dreama", 
            type: ActivityType.Watching 
        }],
        status: "online",
    });

    client.lavalink.init({ ...client.user });
});

client.login(process.env.TOKEN);
                                                          
