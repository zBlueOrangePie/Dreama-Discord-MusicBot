require("dotenv").config();
const { EmbedBuilder } = require("discord.js");

const username = process.env.USERNAME || "Dreama";
const footer = process.env.FOOTER || "Dreama";

const errorEmbed1 = new EmbedBuilder()
    .setColor("FF0000")
    .setTitle("Error")
    .setDescription("An error occurred while executing this command.")
    .setFooter({ text: footer })
    .setTimestamp();

const errorEmbed2 = new EmbedBuilder()
    .setColor("FF0000")
    .setTitle("Error")
    .setDescription("Something went wrong. Please try again later.")
    .setFooter({ text: footer })
    .setTimestamp();

function buildHelpEmbed(client) {
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;

    const embed = new EmbedBuilder()
        .setColor("FF7F50")
        .setTitle(`${username} — Command Guide`)
        .setDescription(
            `👋 Hi! I'm **${username}** and I'm ready to help you!\n` +
            `All available slash commands **(/)** are listed below.\n\n` +
            "Total Available Commands: ```44``` "
        )
        .addFields(
            {
                name: "▶️ Playback",
                value:
                    "**/play** — Play a song or URL\n" +
                    "**/playnext** — Queue a song to play right after the current one\n" +
                    "**/search** — Search for songs and pick what to play\n" +
                    "**/pause** — Pause the current track\n" +
                    "**/resume** — Resume a paused track\n" +
                    "**/stop** — Stop playback and disconnect\n" +
                    "**/skip** — Skip to the next track\n" +
                    "**/skipto** — Jump to a specific queue position\n" +
                    "**/seek** — Seek to a timestamp in the current track\n" +
                    "**/forward** — Fast forward by 15 or 25 seconds\n" +
                    "**/rewind** — Rewind by 15 or 25 seconds",
                inline: false,
            },
            {
                name: "🎛️ Queue & Modes",
                value:
                    "**/queue** — View the current queue\n" +
                    "**/shuffle** — Randomly shuffle all upcoming tracks\n" +
                    "**/clearqueue** — Clear the queue (keeps the current track)\n" +
                    "**/addtrack** — Add a song at a specific queue position\n" +
                    "**/removetrack** — Remove a track from the queue\n" +
                    "**/repeat** — Set repeat mode (Track / Queue / Off)\n" +
                    "**/autoplay** — Toggle autoplay when the queue ends\n" +
                    "**/volume** — Set the playback volume (1–100)\n" +
                    "**/filter** — Apply an audio filter preset",
                inline: false,
            },
            {
                name: "🎵 Now Playing & Info",
                value:
                    "**/nowplaying** — Show what is currently playing\n" +
                    "**/recent** — Show tracks played in the last hour\n" +
                    "**/recommend** — Get a song recommendation by genre",
                inline: false,
            },
            {
                name: "📋 Playlists",
                value:
                    "**/playlist create-server** — Create a guild-only playlist *(Admin / Manage Guild)*\n" +
                    "**/playlist create-global** — Create a private playlist usable in any server\n" +
                    "**/playlist list** — View all playlists you have created\n" +
                    "**/playlist search** — Search through your own playlists\n" +
                    "**/playlist view** — Browse the songs in a playlist\n" +
                    "**/playlist add-song** — Add a song to a playlist\n" +
                    "**/playlist remove-song** — Remove a song from a playlist\n" +
                    "**/playlist play** — Play one of your playlists\n" +
                    "**/playlist delete-server** — Delete a server playlist\n" +
                    "**/playlist delete-global** — Delete a private global playlist",
                inline: false,
            },
            {
                name: "🔧 Voice & Navigation",
                value:
                    "**/join** — Make me join a voice channel\n" +
                    "**/move** — Move me to a different voice channel",
                inline: false,
            },
            {
                name: "⚙️ Utility",
                value:
                    "**/help** — Show this guide\n" +
                    "**/ping** — Check the bot's latency\n" +
                    "**/uptime** — Show how long the bot has been online\n" +
                    "**/avatar** — Display a user's avatar",
                inline: false,
            },
            {
                name: "🛡️ Admin",
                value:
                    "**/config setup channel** — Set the music text channel\n" +
                    "**/config setup voice** — Set the music voice channel\n" +
                    "**/config playlists** — Enable or disable server playlists\n" +
                    "**/config list** — View the current server configuration\n" +
                    "**/config reset** — Reset all server configuration",
                inline: false,
            },
        )
        .setFooter({ text: `${footer} • All commands use Discord slash commands (/)` })
        .setTimestamp();

    if (avatarURL) embed.setThumbnail(avatarURL);

    return embed;
}

module.exports = { errorEmbed1, errorEmbed2, buildHelpEmbed };
