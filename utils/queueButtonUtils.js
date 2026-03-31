require("dotenv").config();
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require("discord.js");
const { formatDuration } = require("./formatDuration.js");

const MAX_DISPLAY = 8;
const FIELD_MAX = 1024;
const NP_FIELD_MAX = 512;

function truncate(str, max) {
    return str.length > max ? str.slice(0, max - 3) + "..." : str;
}

function buildQueueRow(currentPage, totalPages) {
    const prevBtn = new ButtonBuilder()
        .setCustomId(`queue_prev_${currentPage}`)
        .setLabel("◀️ Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0);

    const pageIndicator = new ButtonBuilder()
        .setCustomId("queue_page_indicator")
        .setLabel(`Page ${currentPage + 1} / ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const nextBtn = new ButtonBuilder()
        .setCustomId(`queue_next_${currentPage}`)
        .setLabel("Next ▶️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1);

    return new ActionRowBuilder().addComponents(prevBtn, pageIndicator, nextBtn);
}

function buildQueueEmbed(player, page) {
    const footer = process.env.FOOTER || "Dreama";
    const tracks = player.queue.tracks;
    const current = player.queue.current;
    const total = tracks.length;
    const pages = Math.max(1, Math.ceil(total / MAX_DISPLAY));

    const autoplay = player.get("autoplay") ?? false;
    const repeatMode = player.repeatMode ?? "off";

    const repeatLabels = {
        off: "Off",
        track: "🔂 Track",
        queue: "🔁 Queue",
    };

    const npTitle = current ? truncate(current.info.title, 60) : null;
    const npAuthor = current ? truncate(current.info.author, 40) : null;

    const nowPlaying = current
        ? truncate(
            `**[${npTitle}](${current.info.uri})**\nBy **${npAuthor}** | ${formatDuration(current.info.duration)} | Requested by ${current.requester?.username ?? "Unknown"}`,
            NP_FIELD_MAX
          )
        : "Nothing is playing right now.";

    const start = page * MAX_DISPLAY;
    const slice = tracks.slice(start, start + MAX_DISPLAY);

    let queueList = "No tracks in the queue. Use `/play` to add more!";

    if (slice.length > 0) {
        const lines = [];
        let used = 0;

        for (const [i, track] of slice.entries()) {
            const pos = start + i + 1;
            const title = truncate(track.info.title, 50);
            const line = `\`${pos}.\` **${title}**\n   ${truncate(track.info.author, 30)} • ${formatDuration(track.info.duration)} • ${track.requester?.username ?? "Unknown"}\n`;

            if (used + line.length > FIELD_MAX - 20) {
                lines.push(`*...and more tracks on the next page.*`);
                break;
            }

            lines.push(line);
            used += line.length;
        }

        queueList = lines.join("\n");
    }
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;
    const totalDuration = tracks.reduce((acc, t) => acc + (t.info.duration || 0), 0);

    return new EmbedBuilder()
        .setColor("FF7F50")
        .setTitle("🎶 Current Queue")
        .addFields(
            {
                name: "Now Playing",
                value: nowPlaying,
            },
            {
                name: `Up Next — ${total} track(s)`,
                value: truncate(queueList, FIELD_MAX),
            },
            {
                name: "🔀 Autoplay",
                value: autoplay ? "On" : "Off",
                inline: true,
            },
            {
                name: "🔁 Repeat",
                value: repeatLabels[repeatMode] ?? "Off",
                inline: true,
            },
        )
        .setFooter({ text: truncate(`${footer} • Total queue duration: ${formatDuration(totalDuration)} • Page ${page + 1}/${pages}`, 2048) })
        .setThumbnail(avatarURL)
        .setTimestamp();
}

async function handleQueueButton(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);

    if (!player || !player.connected) {
        return interaction.reply({
            content: "❌ There is no active player in this server.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const parts = interaction.customId.split("_");
    const dir = parts[1];
    const curPage = parseInt(parts[2], 10);

    const tracks = player.queue.tracks;
    const pages = Math.max(1, Math.ceil(tracks.length / MAX_DISPLAY));

    let nextPage = curPage;

    if (dir === "next") nextPage = Math.min(curPage + 1, pages - 1);
    if (dir === "prev") nextPage = Math.max(curPage - 1, 0);

    const embed = buildQueueEmbed(player, nextPage);
    const row = buildQueueRow(nextPage, pages);

    return interaction.update({ embeds: [embed], components: [row] });
}

module.exports = { buildQueueRow, buildQueueEmbed, handleQueueButton };
