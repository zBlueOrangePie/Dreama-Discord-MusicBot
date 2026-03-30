require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { formatDuration } = require('../../utils/formatDuration.js');

const COLORS = {
    DEFAULT: 'FF7F50',
    ERROR: 'FF0000',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rewind')
        .setDescription('Rewind the current track by a set number of seconds.')
        .addIntegerOption(option =>
            option
                .setName('seconds')
                .setDescription('How many seconds to rewind.')
                .setRequired(true)
                .addChoices(
                    { 
                      name: '15 seconds', 
                      value: 15 
                    },
                    { 
                      name: '25 seconds', 
                      value: 25 
                    },
                )
        ),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || 'Dreama';
        const seconds = interaction.options.getInteger('seconds');

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
                        .setDescription(`You must be in <#${player.voiceChannelId}> to control playback.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const currentTrack = player.queue.current;

        if (!currentTrack) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('❌ Nothing Is Playing!')
                        .setDescription('There is no track currently playing.')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!currentTrack.info.isSeekable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('❌ Track Is Not Seekable!')
                        .setDescription('The current track does not support seeking (e.g. live streams).')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const newPosition = Math.max(0, player.position - seconds * 1000);

        await interaction.deferReply();
        await player.seek(newPosition);

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.DEFAULT)
                    .setTitle('⏪ Rewound')
                    .setDescription(`Rewound **${seconds} seconds** back to **${formatDuration(newPosition)}** in **[${currentTrack.info.title}](${currentTrack.info.uri})**.`)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
    },
};
