require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR: "FF0000",
};

const FILTER_PRESETS = {
    bassboost: {
        label: "🔊 Bass Boost",
        apply: async (player) => {
            await player.filterManager.toggleEqualizer([
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
            ]);
        },
    },
    nightcore: {
        label: "🌙 Nightcore",
        apply: async (player) => {
            await player.filterManager.toggleTimescale({ speed: 1.2, pitch: 1.3, rate: 1.0 });
        },
    },
    vaporwave: {
        label: "🌊 Vaporwave",
        apply: async (player) => {
            await player.filterManager.toggleTimescale({ speed: 0.85, pitch: 0.85, rate: 1.0 });
        },
    },
    pop: {
        label: "🎵 Pop",
        apply: async (player) => {
            await player.filterManager.toggleEqualizer([
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
            ]);
        },
    },
    soft: {
        label: "🌿 Soft",
        apply: async (player) => {
            await player.filterManager.toggleLowPass({ smoothing: 20 });
        },
    },
    treble: {
        label: "🔔 Treble Boost",
        apply: async (player) => {
            await player.filterManager.toggleEqualizer([
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
            ]);
        },
    },
    karaoke: {
        label: "🎤 Karaoke",
        apply: async (player) => {
            await player.filterManager.toggleKaraoke({ level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 });
        },
    },
    vibrato: {
        label: "〰️ Vibrato",
        apply: async (player) => {
            await player.filterManager.toggleVibrato({ frequency: 4.0, depth: 0.75 });
        },
    },
    tremolo: {
        label: "🎸 Tremolo",
        apply: async (player) => {
            await player.filterManager.toggleTremolo({ frequency: 4.0, depth: 0.75 });
        },
    },
    reset: {
        label: "🔄 Reset Filters",
        apply: async (player) => {
            await player.filterManager.resetFilters();
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
        const preset = interaction.options.getString("preset");

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Please Join A Voice Channel First!")
                        .setDescription("❌ You need to be in a voice channel to use this command.")
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
                        .setDescription(`❌ You must be in <#${player.voiceChannelId}> to control playback.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply();

        const selected = FILTER_PRESETS[preset];
        await selected.apply(player);

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setTitle("🎛️ Filter Applied")
                    .setDescription(`Filter **${selected.label}** has been applied to the current playback.`)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
    },
};
                
