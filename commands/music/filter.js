require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR: "FF0000",
};

// Each preset's `apply` function sets the filter data directly on
// player.filterManager.data and then calls applyPlayerFilters().
// This approach avoids the "toggleX is not a function" errors caused
// by lavalink-client version mismatches with the toggle/set helper methods.
//
// Only filters that are enabled in your application.yml are included:
// equalizer, timescale, karaoke, lowPass, tremolo, vibrato.
// (channelMix, distortion, rotation are also available if needed later.)

const FILTER_PRESETS = {
    bassboost: {
        label: "🔊 Bass Boost",
        apply: async (filterManager) => {
            filterManager.data.equalizer = [
                { 
                    band: 0, 
                    gain:  0.6  
                },
                { 
                    band: 1, 
                    gain:  0.67 
                },
                { 
                    band: 2, 
                    gain:  0.67 
                },
                { 
                    band: 3, 
                    gain:  0.4  
                },
                { 
                    band: 4, 
                    gain:  0.0  
                },
                { 
                    band: 5, 
                    gain: -0.5  
                },
                { 
                    band: 6, 
                    gain: -0.1  
                },
                { 
                    band: 7, 
                    gain: -0.1  
                },
                { 
                    band: 8, 
                    gain: -0.1  
                },
                { 
                    band: 9, 
                    gain: -0.1  
                },
            ];
            await filterManager.applyPlayerFilters();
        },
    },

    nightcore: {
        label: "🌙 Nightcore",
        apply: async (filterManager) => {
            filterManager.data.timescale = { speed: 1.2, pitch: 1.3, rate: 1.0 };
            await filterManager.applyPlayerFilters();
        },
    },

    vaporwave: {
        label: "🌊 Vaporwave",
        apply: async (filterManager) => {
            filterManager.data.timescale = { speed: 0.85, pitch: 0.85, rate: 1.0 };
            await filterManager.applyPlayerFilters();
        },
    },

    pop: {
        label: "🎵 Pop",
        apply: async (filterManager) => {
            filterManager.data.equalizer = [
                { 
                    band: 0, 
                    gain: -0.05 
                },
                { 
                    band: 1, 
                    gain:  0.2  
                },
                {
                    band: 2,
                    gain:  0.2
                },
                { 
                    band: 3, 
                    gain:  0.1 
                },
                {
                    band: 4, 
                    gain:  0.0  
                },
                { 
                    band: 5, 
                    gain: -0.1 
                },
                { 
                    band: 6, 
                    gain: -0.1 
                },
                { 
                    band: 7,
                    gain: -0.1 
                },
                { 
                    band: 8,
                    gain:  0.0  
                },
                { 
                    band: 9, 
                    gain:  0.0  
                },
            ];
            await filterManager.applyPlayerFilters();
        },
    },

    soft: {
        label: "🌿 Soft",
        apply: async (filterManager) => {
            filterManager.data.lowPass = { smoothing: 20 };
            await filterManager.applyPlayerFilters();
        },
    },

    treble: {
        label: "🔔 Treble Boost",
        apply: async (filterManager) => {
            filterManager.data.equalizer = [
                { 
                    band: 0,
                    gain: -0.3 
                },
                { 
                    band: 1, 
                    gain: -0.2
                },
                {
                    band: 2, 
                    gain: -0.1 
                },
                { 
                    band: 3, 
                    gain:  0.0 
                },
                { 
                    band: 4,
                    gain:  0.1
                },
                {
                    band: 5, 
                    gain:  0.2 
                },
                { 
                    band: 6, 
                    gain:  0.3
                },
                {
                    band: 7,
                    gain:  0.4
                },
                { 
                    band: 8, 
                    gain:  0.4 
                },
                { 
                    band: 9,
                    gain:  0.4
                },
            ];
            await filterManager.applyPlayerFilters();
        },
    },

    karaoke: {
        label: "🎤 Karaoke",
        apply: async (filterManager) => {
            filterManager.data.karaoke = {
                level: 1.0,
                monoLevel: 1.0,
                filterBand: 220.0,
                filterWidth: 100.0,
            };
            await filterManager.applyPlayerFilters();
        },
    },

    vibrato: {
        label: "〰️ Vibrato",
        apply: async (filterManager) => {
            filterManager.data.vibrato = {
                frequency: 4.0, 
                depth: 0.75
            };
            await filterManager.applyPlayerFilters();
        },
    },

    tremolo: {
        label: "🎸 Tremolo",
        apply: async (filterManager) => {
            filterManager.data.tremolo = { 
                frequency: 4.0, 
                depth: 0.75
            };
            await filterManager.applyPlayerFilters();
        },
    },

    reset: {
        label: "🔄 Reset Filters",
        apply: async (filterManager) => {
            await filterManager.resetFilters();
        },
    },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("filter")
        .setDescription("Apply an audio filter preset to the current playback.")
        .addStringOption(option =>
            option
                .setName("preset")
                .setDescription("Choose a filter to apply.")
                .setRequired(true)
                .addChoices(
                    { 
                        name: "🔊 Bass Boost", 
                        value: "bassboost"
                    },
                    { 
                        name: "🌙 Nightcore",   
                        value: "nightcore" 
                    },
                    {
                        name: "🌊 Vaporwave",   
                        value: "vaporwave"
                    },
                    { 
                        name: "🎵 Pop",    
                        value: "pop"     
                    },
                    { 
                        name: "🌿 Soft",    
                        value: "soft"    
                    },
                    { 
                        name: "🔔 Treble Boost",  
                        value: "treble"  
                    },
                    { 
                        name: "🎤 Karaoke",   
                        value: "karaoke"  
                    },
                    { 
                        name: "〰️ Vibrato",   
                        value: "vibrato"  
                    },
                    {
                        name: "🎸 Tremolo",   
                        value: "tremolo" 
                    },
                    { 
                        name: "🔄 Reset Filters", 
                        value: "reset"   
                    },
                )
        ),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || "Dreama";
        const preset  = interaction.options.getString("preset");

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Please Join A Voice Channel First!")
                        .setDescription("You need to be in a voice channel to use this command.")
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
                        .setTitle("❌ Nothing Is Playing!")
                        .setDescription("There is no active player in this server.")
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
                        .setTitle("‼️ Wrong Voice Channel!")
                        .setDescription(`You must be in <#${player.voiceChannelId}> to control playback.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!player.queue.current) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Nothing Is Playing!")
                        .setDescription("There is no track currently playing to apply a filter to.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply();

        const selected = FILTER_PRESETS[preset];
        const filterManager = player.filterManager;

        // When reapplying (not reset), clear the current filter data first
        // so the new preset starts from a clean state.
        if (preset !== "reset") {
            filterManager.data = {};
        }

        try {
            await selected.apply(filterManager);
        } catch (err) {
            console.error(`[Filter] ❌ Failed to apply filter "${preset}":`, err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Filter Failed")
                        .setDescription(`Could not apply the **${selected.label}** filter. Please try again.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.DEFAULT)
                    .setTitle("🎛️ Filter Applied")
                    .setDescription(
                        preset === "reset"
                            ? "All filters have been **reset**. Playback is back to normal."
                            : `Filter **${selected.label}** has been applied to the current playback.`
                    )
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
    },
};
