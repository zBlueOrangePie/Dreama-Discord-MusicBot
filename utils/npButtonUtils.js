require("dotenv").config();
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

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

    const pauseResumeBtn = new ButtonBuilder()
        .setCustomId("np_pause_resume")
        .setLabel(paused ? "▶️ Resume" : "⏸️ Pause")
        .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary);

    const skipBtn = new ButtonBuilder()
        .setCustomId("np_skip")
        .setLabel("⏭️ Skip")
        .setStyle(ButtonStyle.Secondary);

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

    return new ActionRowBuilder().addComponents(pauseResumeBtn, skipBtn, stopBtn, repeatBtn, autoplayBtn);
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

    return new ActionRowBuilder().addComponents(pauseResumeBtn, skipBtn, stopBtn, repeatBtn, autoplayBtn);
}

async function syncNpMessage(player) {
    if (!player.npMessage) return;
    await player.npMessage.edit({ components: [buildNpRow(player)] }).catch(() => null);
}

async function handleNpButton(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);

    if (!player || !player.connected) {
        return interaction.reply({
            content   : "❌ There is no active player in this server.",
            ephemeral : true,
        });
    }

    const voiceChannel = interaction.member.voice?.channel;

    if (!voiceChannel || voiceChannel.id !== player.voiceChannelId) {
        return interaction.reply({
            content   : `❌ You must be in <#${player.voiceChannelId}> to use these controls.`,
            ephemeral : true,
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
        await interaction.deferUpdate();
        await player.skip(0, false);
        return;
    }

    if (id === "np_stop") {
        await player.stopPlaying(true, false);
        await player.destroy();
        return interaction.update({ components: [buildDisabledNpRow()] });
    }

    if (id === "np_repeat") {
        const current = player.repeatMode ?? "off";
        const next    = REPEAT_CYCLE[current];
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
