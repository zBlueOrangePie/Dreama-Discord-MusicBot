require("dotenv").config();
const { ContainerBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SeparatorSpacingSize } = require("discord.js");
const { formatDuration } = require("./formatDuration.js");

const MAX_DISPLAY = 8;
const FIELD_MAX = 1024;

function truncate(str, max) {
    return str.length > max ? str.slice(0, max - 3) + "..." : str;
}

function buildQueueComponents(player, page, client) {
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? "https://cdn.discordapp.com/embed/avatars/0.png";
    const tracks = player.queue.tracks;
    const current = player.queue.current;
    const total = tracks.length;
    const totalPages = Math.max(1, Math.ceil(total / MAX_DISPLAY));
    const autoplay = player.get("autoplay") ?? false;
    const repeatMode = player.repeatMode ?? "off";

    const repeatLabels = { 
        off: "Off", 
        track: "🔂 Track", 
        queue: "🔁 Queue" 
    };

    const nowPlayingText = current
        ? `**[${truncate(current.info.title, 60)}](${current.info.uri})**\n` +
          `By **${truncate(current.info.author, 40)}** — ${formatDuration(current.info.duration)} — Requested by ${current.requester?.username ?? "Unknown"}`
        : "Nothing is playing right now.";

    const start = page * MAX_DISPLAY;
    const slice = tracks.slice(start, start + MAX_DISPLAY);

    let queueListText = "No tracks in the queue. Use `/play` to add more!";

    if (slice.length > 0) {
        const lines = [];
        let used = 0;

        for (const [i, track] of slice.entries()) {
            const pos = start + i + 1;
            const line = `\`${pos}.\` **${truncate(track.info.title, 50)}**\n   ${truncate(track.info.author, 30)} · ${formatDuration(track.info.duration)} · ${track.requester?.username ?? "Unknown"}\n`;

            if (used + line.length > FIELD_MAX - 20) {
                lines.push("*...and more tracks on the next page.*");
                break;
            }

            lines.push(line);
            used += line.length;
        }

        queueListText = lines.join("\n");
    }

    const totalDuration = tracks.reduce((acc, t) => acc + (t.info.duration || 0), 0);
    const statsLine = `🔀 Autoplay: ${autoplay ? "On" : "Off"}   ·   🔁 Repeat: ${repeatLabels[repeatMode] ?? "Off"}   ·   ⏱️ Total: ${formatDuration(totalDuration)}   ·   Page ${page + 1}/${totalPages}`;

    const container = new ContainerBuilder()
        .setAccentColor(0xFF7F50)
        .addSectionComponents((section) =>
            section
                .addTextDisplayComponents((text) =>
                    text.setContent("## 🎶 Current Queue")
                )
                .setThumbnailAccessory((thumb) =>
                    thumb.setURL(current?.info?.artworkUrl || avatarURL)
                )
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        )
        .addTextDisplayComponents((text) =>
            text.setContent(`### 🎵 Now Playing\n${nowPlayingText}`)
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents((text) =>
            text.setContent(truncate(`### 📋 Up Next — ${total} track(s)\n${queueListText}`, FIELD_MAX))
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents((text) =>
            text.setContent(`-# ${statsLine}`)
        );

    if (total > MAX_DISPLAY) {
        container.addActionRowComponents((row) =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`queue_prev_${page}`)
                    .setLabel("◀️ Previous")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId("queue_page_indicator")
                    .setLabel(`Page ${page + 1} / ${totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`queue_next_${page}`)
                    .setLabel("Next ▶️")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages - 1)
            )
        );
    }

    return [container];
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
    const totalPages = Math.max(1, Math.ceil(player.queue.tracks.length / MAX_DISPLAY));

    let nextPage = curPage;
    if (dir === "next") nextPage = Math.min(curPage + 1, totalPages - 1);
    if (dir === "prev") nextPage = Math.max(curPage - 1, 0);

    return interaction.update({
        components: buildQueueComponents(player, nextPage, client),
        flags: MessageFlags.IsComponentsV2,
    });
}

module.exports = { buildQueueComponents, handleQueueButton };
