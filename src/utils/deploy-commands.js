import { REST, Routes } from 'discord.js';
import config from './config.json' assert { type: 'json' };
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// __dirname rekonstruieren, weil es in ES Modules nicht existiert
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { clientId, token } = config;

const commands = [];

// Alle Ordner im "commands"-Verzeichnis laden
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = await import(pathToFileURL(filePath).href);
		const commandData = command.default;

		if ('data' in commandData && 'execute' in commandData) {
			commands.push(commandData.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// REST-Client erstellen
const rest = new REST().setToken(token);

// Commands deployen
try {
	console.log(`Started refreshing ${commands.length} application (/) commands.`);

	const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
    );

	console.log(`Successfully reloaded ${data.length} application (/) commands.`);
} catch (error) {
	console.error(error);
}
