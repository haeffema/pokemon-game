import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';

const commandData = new SlashCommandBuilder()
    .setName('challenge')
    .setDescription('Challenge the next arena leader with your current team');

const execute = async (interaction) => {

    var query = "SELECT * FROM spieler where discordid = ?";
        var results = await new Promise((resolve, reject) => {
            connection.query(query, [interaction.user.id], function (err, results) {
                if (err) {
                    reject("Datenbankfehler: " + err);
                } else {
                    resolve(results);
                }
            });
        });
        if (results.length > 0) {
            var query="Insert into challenge (spieler, aktiv, arena) VALUES (?,?,?)";
            connection.query(query, [results[0].Name, 1, arenas[results[0].Orden]])
            await interaction.reply("Your challenge has been sent to the arena leader. He'll contact you shortly. Good luck... you'll need it. ");
        }
    
};

export default {
    data: commandData,
    execute: execute
};

var arenas = [
    "Normal", "Fire", "Fighting", "Ground", "Electric", "Dragon", "Dark", "Ghost"
]