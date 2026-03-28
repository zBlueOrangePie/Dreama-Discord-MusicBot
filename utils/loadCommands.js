const fs = require('fs');
const path = require('path');

function loadCommands(client, dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true }); 

    for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(client, filePath); // Recursive call
        } else if (file.name.endsWith('.js')) {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            }
        }
    }
}
module.exports = { loadCommands };
