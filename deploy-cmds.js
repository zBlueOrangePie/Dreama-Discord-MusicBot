require('dotenv').config()
const { REST, Routes } = require('discord.js');
const clientId = process.env.CLIENT_ID;
const token = process.env.TOKEN;
const fs = require('fs');
const path = require('path');

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    }
  }
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Refreshing ${commands.length} application (/) commands.`);
    await rest.put(
      Routes.applicationCommands(clientId), // Global registration
      { body: commands },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

module.exports = { rest };
