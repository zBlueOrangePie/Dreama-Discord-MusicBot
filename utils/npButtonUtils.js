require("dotenv").config();
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require("discord.js");

const REPEAT_CYCLE = {
    off: "track",
    track: "queue",
    queue: "off",
};

const REPEAT_LABELS = {
    off: "🔁 Repeat: Off",
    track: "🔂 Repeat: Track",
    queue: "🔁 Repeat: Queue",
};

const REPEAT_STYLES = {
    off: ButtonStyle.Secondary,
    track: ButtonStyle.Primary,
    queue: ButtonStyle.Success,
};

function buildNpRow(player) {
    const paused = player.paused;
    const repeatMode = player.repeatMode ?? "off";
    const autoplay = player.get("autoplay") ?? false;
    const hasNextTrack = (player.queue?.tracks?.length ?? 0) > 0;

    const pauseResumeBtn = new ButtonBuilder()
        .setCustomId("np_pause_resume")
        .setLabel(paused ? "▶️ Resume" : "⏸️ Pause")
        .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary);

    const skipBtn = new ButtonBuilder()
        .setCustomId("np_skip")
        .setLabel("⏭️ Skip")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasNextTrack);

    const stopBtn = new ButtonBuilder()
        .setCustomId("np_stop")
        .setLabel("⏹️ Stop")
        .setStyle(ButtonStyle.Danger);

    const repeatBtn = new ButtonBuilder()
        .setCustomId("np_repeat")
        .setLabel(REPEAT_LABELS[repeatMode])
        .setStyle(REPEAT_STYLES[repeatMode]);

    const autoplayBtn = new ButtonBuilder()
        .setCustomId("np_autoplay")
        .setLabel(autoplay ? "🔀 Autoplay: On" : "🔀 Autoplay: Off")
        .setStyle(autoplay ? ButtonStyle.Success : ButtonStyle.Secondary);

    return new ActionRowBuilder().addComponents(
        pauseResumeBtn, 
        skipBtn, 
        stopBtn, 
        repeatBtn, 
        autoplayBtn
    );
}

function buildDisabledNpRow() {
    const pauseResumeBtn = new ButtonBuilder()
        .setCustomId("np_pause_resume")
        .setLabel("⏸️ Pause")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

    const skipBtn = new ButtonBuilder()
        .setCustomId("np_skip")
        .setLabel("⏭️ Skip")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const stopBtn = new ButtonBuilder()
        .setCustomId("np_stop")
        .setLabel("⏹️ Stop")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true);

    const repeatBtn = new ButtonBuilder()
        .setCustomId("np_repeat")
        .setLabel("🔁 Repeat: Off")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const autoplayBtn = new ButtonBuilder()
        .setCustomId("np_autoplay")
        .setLabel("🔀 Autoplay: Off")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    return new ActionRowBuilder()
        .addComponents(
            pauseResumeBtn, 
            skipBtn, 
            stopBtn, 
            repeatBtn, 
            autoplayBtn
        );
}

async function syncNpMessage(player) {
    if (!player.npMessage) return;
    await player.npMessage.edit({ components: [buildNpRow(player)] }).catch(() => null);
}

async function handleNpButton(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    const footer = process.env.FOOTER || "Dreama";

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

    if (id === "np_pause_resume") {
        if (player.paused) {
            await player.resume();
        } else {
            await player.pause();
        }
        return interaction.update({ components: [buildNpRow(player)] });
    }

    if (id === "np_skip") {
        const hasNextTrack = (player.queue?.tracks?.length ?? 0) > 0;

        if (!hasNextTrack) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("FF0000")
                        .setTitle("❌ Cannot Skip!")
                        .setDescription("You can't use this when there is only one song in the current queue. Use **/play** to add more songs or **/stop** or click the stop button if you don't want to listen anymore.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferUpdate();
        await player.skip(0, false);
        return;
    }

    if (id === "np_stop") {
        player.set("manualStop", true);
        await player.stopPlaying(true, false);
        await player.destroy();
        await interaction.update({ components: [buildDisabledNpRow()] });
        return interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setColor("50C878")
                    .setTitle("⏹️ Stopped")
                    .setDescription("Playback has been stopped, the queue has been cleared, and I have disconnected.")
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
            flags: MessageFlags.Ephemeral,
        });
    }

    if (id === "np_repeat") {
        const current = player.repeatMode ?? "off";
        const next = REPEAT_CYCLE[current];
        await player.setRepeatMode(next);
        return interaction.update({ components: [buildNpRow(player)] });
    }

    if (id === "np_autoplay") {
        const current = player.get("autoplay") ?? false;
        player.set("autoplay", !current);
        return interaction.update({ components: [buildNpRow(player)] });
    }
}

module.exports = { buildNpRow, buildDisabledNpRow, syncNpMessage, handleNpButton };
