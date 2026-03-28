const { REST, Routes } = require('discord.js');
require('dotenv').config();

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

const rest = new REST({ version: '10' }).setToken(token);

// Deletes all global commands
rest.put(Routes.applicationCommands(clientId), { body: [] })
	.then(() => console.log('[Initializer] ✅ Successfully deleted all global application commands.'))
	.catch(console.error);
