require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits, ChannelType } = require('discord.js');
const GuildConfig = require('../../utils/database/configDb.js');

const COLORS = {
    DEFAULT: 'FF7F50',
    SUCCESS: '50C878',
    ERROR: 'FF0000',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure Dreama settings for this server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommandGroup(group =>
            group
                .setName('setup')
                .setDescription('Configure a specific setting.')
                .addSubcommand(sub =>
                    sub
                        .setName('channel')
                        .setDescription('Set the text channel where music commands can be used.')
                        .addChannelOption(option =>
                            option
                                .setName('channel')
                                .setDescription('The text channel to restrict music commands to. Leave empty to allow all channels.')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(false)
                        )
                )
                .addSubcommand(sub =>
                    sub
                        .setName('voice')
                        .setDescription('Set the voice channel where Dreama can join and play music.')
                        .addChannelOption(option =>
                            option
                                .setName('channel')
                                .setDescription('The voice channel to restrict Dreama to. Leave empty to allow all voice channels.')
                                .addChannelTypes(ChannelType.GuildVoice)
                                .setRequired(false)
                        )
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('list')
                .setDescription('Show all current Dreama settings for this server.')
        )
        .addSubcommand(sub =>
            sub
                .setName('reset')
                .setDescription('Reset all Dreama settings back to default and delete the saved configuration.')
        ),

    async execute(interaction) {
        const guild = interaction.guild;
        const member = interaction.member;
        const footer = process.env.FOOTER || 'Dreama';

        const hasPerms =
            member.permissions.has(PermissionFlagsBits.Administrator) ||
            member.permissions.has(PermissionFlagsBits.ManageGuild);

        if (!hasPerms) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle(`❌ Dreama Said You're Missing Permissions!`)
                        .setDescription('You need **Administrator** or **Manage Server** permissions to use this command.')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();

        if (subcommandGroup === 'setup') {
            if (subcommand === 'musicchannel') {
                const channel = interaction.options.getChannel('channel');

                await GuildConfig.findOneAndUpdate(
                    { 
                      guildId: guild.id 
                    },
                    { 
                      musicChannel: channel?.id ?? null 
                    },
                    { 
                      upsert: true, 
                      new: true 
                    }
                );

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.SUCCESS)
                            .setTitle('✅ Music Channel Updated')
                            .setDescription(
                                channel
                                    ? `Music commands are now restricted to <#${channel.id}>.`
                                    : 'Music commands can now be used in any channel. Dreama can be used on every channel!'
                            )
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                });
            }

            if (subcommand === 'musicvoice') {
                const channel = interaction.options.getChannel('channel');

                await GuildConfig.findOneAndUpdate(
                    { 
                      guildId: guild.id 
                    },
                    { 
                      musicVoice: channel?.id ?? null 
                    },
                    { 
                      upsert: true, 
                      new: true 
                    }
                );

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.SUCCESS)
                            .setTitle('✅ Music Voice Channel Updated')
                            .setDescription(
                                channel
                                    ? `Dreama will only join and play music in <#${channel.id}>.`
                                    : 'Dreama can now join any voice channel. Dreama can be used on every voice channel!'
                            )
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                });
            }
        }

        if (subcommand === 'list') {
            const config = await GuildConfig.findOne({ guildId: guild.id });

            const musicChannel = config?.musicChannel ? `<#${config.musicChannel}>` : 'None (all channels allowed)';
            const musicVoice = config?.musicVoice   ? `<#${config.musicVoice}>`   : 'None (all voice channels allowed)';

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.DEFAULT)
                        .setTitle('⚙️ Current Server Configuration')
                        .addFields(
                            { 
                              name: 'Music Channel', 
                              value: musicChannel, 
                              inline: true 
                            },
                            { 
                              name: 'Music Voice',   
                              value: musicVoice,   
                              inline: true 
                            },
                        )
                        .setFooter({ text: `${footer} • More Settings Will Arrive Soon!` })
                        .setTimestamp(),
                ],
            });
        }

        if (subcommand === 'reset') {
            await GuildConfig.findOneAndDelete({ guildId: guild.id });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle('🔄 Configuration Reset')
                        .setDescription('All settings have been reset to default and the saved configuration has been deleted.')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }
    },
};
