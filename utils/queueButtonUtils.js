require("dotenv").config();
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { formatDuration } = require("./formatDuration.js");

const MAX_DISPLAY = 10;

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

    const nowPlaying = current
        ? [
            `**[${current.info.title}](${current.info.uri})**`,
            `By **${current.info.author}** | ${formatDuration(current.info.duration)} | Requested by ${current.requester?.username ?? "Unknown"}`,
          ].join("\n")
        : "Nothing is playing right now.";

    const start = page * MAX_DISPLAY;
    const slice = tracks.slice(start, start + MAX_DISPLAY);

    let queueList = "";

    if (slice.length > 0) {
        queueList = slice
            .map((track, i) => {
                const pos = start + i + 1;
                return `\`${pos}.\` **[${track.info.title}](${track.info.uri})**\n` +
                       `   By **${track.info.author}** | ${formatDuration(track.info.duration)} | Requested by ${track.requester?.username ?? "Unknown"}`;
            })
            .join("\n\n");
    } else {
        queueList = "No tracks in the queue. Use `/play` to add more!";
    }

    const totalDuration = tracks.reduce((acc, t) => acc + (t.info.duration || 0), 0);

    return new EmbedBuilder()
        .setColor("5865F2")
        .setTitle("🎶 Current Queue")
        .addFields(
            {
                name: "Now Playing",
                value: nowPlaying,
            },
            {
                name: `Up Next — ${total} track(s)`,
                value: queueList,
            },
        )
        .setFooter({ text: `${footer} • Total queue duration: ${formatDuration(totalDuration)} • Page ${page + 1}/${pages}` })
        .setTimestamp();
}

async function handleQueueButton(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);

    if (!player || !player.connected) {
        return interaction.reply({
            content  : "❌ There is no active player in this server.",
            ephemeral : true,
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
