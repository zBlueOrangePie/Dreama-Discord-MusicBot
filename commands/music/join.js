require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ChannelType } = require('discord.js');
const GuildConfig = require('../../utils/database/configDb.js');

const COLORS = {
    DEFAULT: 'FF7F50',
    SUCCESS: '50C878',
    ERROR: 'FF0000',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Make Dreama join a voice channel.')
        .addChannelOption(option =>
            option
                .setName('voice-channel')
                .setDescription('The voice channel to join. Defaults to your current channel.')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(false)
        ),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const footer = process.env.FOOTER || 'Dreama';
        const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;

        const guildConfig = await GuildConfig.findOne({ guildId: guild.id });

        const targetChannel =
            interaction.options.getChannel('voice-channel') ||
            member.voice?.channel;

        if (!targetChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('‼️ No Voice Channel Specified!')
                        .setDescription('Please join a voice channel or provide one as an option.')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (guildConfig?.musicVoice) {
            if (targetChannel.id !== guildConfig.musicVoice) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('‼️ Wrong Voice Channel!')
                            .setDescription(`Dreama is configured to only join <#${guildConfig.musicVoice}>. Please use that voice channel.`)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        const botVoiceChannel = guild.members.me?.voice?.channel;
        if (botVoiceChannel && botVoiceChannel.id === targetChannel.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Already There!")
                        .setDescription(`I'm already in <#${targetChannel.id}>.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!client.lavalink.useable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('❌ Internal Error Occurred.')
                        .setDescription('No music nodes are available right now. Please try again later.')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const player = client.lavalink.createPlayer({
            guildId: guild.id,
            voiceChannelId: targetChannel.id,
            textChannelId: interaction.channel.id,
            selfDeaf: true,
        });

        if (!player.connected) await player.connect();

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.DEFAULT)
                    .setTitle('✅ Joined Voice Channel')
                    .setDescription(`Dreama has joined <#${targetChannel.id}>. Use **/play** to start playing music!`)
                    .setThumbnail(avatarURL)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
    },
};
