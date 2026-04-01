require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const COLORS = {
    DEFAULT: 'FF7F50',
    SUCCESS: '50C878',
    ERROR: 'FF0000',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearqueue')
        .setDescription('Clear the queue while keeping the currently playing song.'),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || 'Dreama';
        const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('‼️ Please Join A Voice Channel First!')
                        .setDescription('You need to be in a voice channel to use this command.')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const player = client.lavalink.getPlayer(guild.id);

        if (!player || !player.connected) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('❌ Nothing Is Playing!')
                        .setDescription('There is no active player in this server.')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (player.voiceChannelId !== voiceChannel.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('‼️ Wrong Voice Channel!')
                        .setDescription(`You must be in <#${player.voiceChannelId}> to manage the queue.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const trackCount = player.queue.tracks.length;

        if (trackCount === 0) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('📭 Queue Is Already Empty!')
                        .setDescription('There are no upcoming tracks to clear.')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (player.queue.tracks.length > 0) {
            player.queue.tracks.splice(0, player.queue.tracks.length);
        }

        const current = player.queue.current;
        const currentTitle = current ? `**[${current.info.title}](${current.info.uri})**` : 'nothing';

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.DEFAULT)
                    .setTitle('🧹 Queue Cleared')
                    .setDescription(`Removed **${trackCount}** track(s) from the queue.\n\nCurrently still playing: ${currentTitle}`)
                    .setThumbnail(avatarURL)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
    },
};
