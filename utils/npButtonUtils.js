require("dotenv").config();
const { ContainerBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SeparatorSpacingSize } = require("discord.js");
const { formatDuration } = require("./formatDuration.js");

const REPEAT_CYCLE = {
    off: "track",
    track: "queue",
    queue: "off",
};

const REPEAT_LABELS = {
    off: "Off",
    track: "Track",
    queue: "Queue",
};

const REPEAT_STYLES = {
    off: ButtonStyle.Secondary,
    track: ButtonStyle.Primary,
    queue: ButtonStyle.Success,
};

function buildNpComponents(player, track, client) {
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? "https://cdn.discordapp.com/embed/avatars/0.png";
    const thumbnailUrl = track?.info?.artworkUrl || avatarURL;
    const title = track?.info?.title      || "Unknown";
    const uri = track?.info?.uri        || "";
    const source = track?.info?.sourceName || "Unknown";
    const author = track?.info?.author     || "Unknown";
    const duration = formatDuration(track?.info?.duration || 0);
    const requester = track?.requester?.username || "Unknown";
    const repeatMode = player.repeatMode ?? "off";
    const autoplay = player.get("autoplay") ?? false;
    const paused = player.paused;
    const hasNext = (player.queue?.tracks?.length ?? 0) > 0;

    const statusLine = `${paused ? "⏸️ Paused" : "▶️ Playing"}   ·   🔁 Repeat: ${REPEAT_LABELS[repeatMode]}   ·   🔀 Autoplay: ${autoplay ? "On" : "Off"}`;

    const container = new ContainerBuilder()
        .setAccentColor(0xFF7F50)
        .addSectionComponents((section) =>
            section
                .addTextDisplayComponents((text) =>
                    text.setContent(`## 🎵 Now Playing\n**[${title}](${uri})**`)
                )
                .setThumbnailAccessory((thumb) => thumb.setURL(thumbnailUrl))
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents((text) =>
            text.setContent(
                `**Source:** ${source}\n` +   
                `**Author:** ${author}\n` +
                `**Duration:** ${duration}\n` +   
                `**Requested by:** ${requester}\n\n` +
                `-# ${statusLine}`
            )
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents((row) =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId("np_pause_resume")
                    .setLabel(paused ? "▶️ Resume" : "⏸️ Pause")
                    .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("np_skip")
                    .setLabel("⏭️ Skip")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!hasNext),
                new ButtonBuilder()
                    .setCustomId("np_stop")
                    .setLabel("⏹️ Stop")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId("np_repeat")
                    .setLabel(`🔁 Repeat: ${REPEAT_LABELS[repeatMode]}`)
                    .setStyle(REPEAT_STYLES[repeatMode]),
                new ButtonBuilder()
                    .setCustomId("np_autoplay")
                    .setLabel(autoplay ? "🔀 Autoplay: On" : "🔀 Autoplay: Off")
                    .setStyle(autoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
            )
        );

    return [container];
}

function buildDisabledNpComponents(player) {
    const track = player.npTrack;
    const client = player.npClient;
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? "https://cdn.discordapp.com/embed/avatars/0.png";
    const thumbUrl = track?.info?.artworkUrl || avatarURL;
    const title = track?.info?.title || "Unknown";
    const uri = track?.info?.uri || "";
    const author = track?.info?.author || "Unknown";
    const duration = formatDuration(track?.info?.duration || 0);

    const container = new ContainerBuilder()
        .setAccentColor(0x808080)
        .addSectionComponents((section) =>
            section
                .addTextDisplayComponents((text) =>
                    text.setContent(`## ⏹️ Finished Playing\n**[${title}](${uri})**`)
                )
                .setThumbnailAccessory((thumb) => thumb.setURL(thumbUrl))
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents((text) =>
            text.setContent(`**Author:** ${author}\n` +   
                            `**Duration:** ${duration}\n
                            -# Playback has now ended.`)
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents((row) =>
            row.addComponents(
                new ButtonBuilder().setCustomId("np_pause_resume").setLabel("⏸️ Pause").setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId("np_skip").setLabel("⏭️ Skip").setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId("np_stop").setLabel("⏹️ Stop").setStyle(ButtonStyle.Danger).setDisabled(true),
                new ButtonBuilder().setCustomId("np_repeat").setLabel("🔁 Repeat: Off").setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId("np_autoplay").setLabel("🔀 Autoplay: Off").setStyle(ButtonStyle.Secondary).setDisabled(true)
            )
        );

    return [container];
}

async function syncNpMessage(player) {
    if (!player.npMessage) return;
    const track  = player.queue.current;
    const client = player.npClient;
    await player.npMessage.edit({
        components: buildNpComponents(player, track, client),
        flags: MessageFlags.IsComponentsV2,
    }).catch(() => null);
}

async function handleNpButton(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);

    if (!player || !player.connected) {
        return interaction.reply({
            content: "❌ There is no active player in this server.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const voiceChannel = interaction.member.voice?.channel;
    if (!voiceChannel || voiceChannel.id !== player.voiceChannelId) {
        return interaction.reply({
            content: `❌ You must be in <#${player.voiceChannelId}> to use these controls.`,
            flags: MessageFlags.Ephemeral,
        });
    }

    const id = interaction.customId;
    const track = player.queue.current;

    if (id === "np_pause_resume") {
        if (player.paused) await player.resume();
        else await player.pause();
        return interaction.update({
            components: buildNpComponents(player, track, client),
            flags: MessageFlags.IsComponentsV2,
        });
    }

    if (id === "np_skip") {
        const hasNext = (player.queue?.tracks?.length ?? 0) > 0;
        if (!hasNext) {
            return interaction.reply({
                content: "❌ No more songs in the queue. Use **/play** to add more, or click **⏹️ Stop** to disconnect.",
                flags: MessageFlags.Ephemeral,
            });
        }
        await interaction.deferUpdate();
        await player.skip(0, false);
        return;
    }

    if (id === "np_stop") {
        const snapshot = { npTrack: player.npTrack || track, npClient: player.npClient || client };
        player.set("manualStop", true);
        await player.stopPlaying(true, false);
        await player.destroy();
        await interaction.update({
            components: buildDisabledNpComponents(snapshot),
            flags: MessageFlags.IsComponentsV2,
        });
        return interaction.followUp({
            content: "⏹️ Playback stopped, queue cleared, and I have disconnected.",
            flags: MessageFlags.Ephemeral,
        });
    }

    if (id === "np_repeat") {
        const next = REPEAT_CYCLE[player.repeatMode ?? "off"];
        await player.setRepeatMode(next);
        return interaction.update({
            components: buildNpComponents(player, track, client),
            flags: MessageFlags.IsComponentsV2,
        });
    }

    if (id === "np_autoplay") {
        player.set("autoplay", !(player.get("autoplay") ?? false));
        return interaction.update({
            components: buildNpComponents(player, track, client),
            flags: MessageFlags.IsComponentsV2,
        });
    }
}

module.exports = { buildNpComponents, buildDisabledNpComponents, syncNpMessage, handleNpButton };
