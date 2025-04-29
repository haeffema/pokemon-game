import { SlashCommandBuilder } from 'discord.js';
import connection from '../../utils/databaseConnection.js';
import pokemonData from '../../data/pokemon.json' with { type: 'json' };

const commandData = new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register a Pokemon set using its pokepaste')
    .addStringOption(option =>
        option.setName('pokepaste')
            .setDescription('Link to your Pokepaste')
            .setRequired(true)
    );

// Hilfsfunktion: Pokepaste-Text parsen
function parsePokepaste(pasteText) {
    const lines = pasteText.trim().split('   ').map(line => line.trim()).filter(Boolean);
    const pokePasteStringFormat = lines.join('\n');
    const firstLine = lines[0];
    const [namePart, itemPart] = firstLine.split(' @ ');
    const name = namePart.trim();
    const item = itemPart ? itemPart.trim() : null;

    let ability = null;
    const moves = [];

    for (const line of lines) {
        if (line.startsWith('Ability:')) {
            ability = line.replace('Ability:', '').trim();
        } else if (line.startsWith('-')) {
            moves.push(line.replace('-', '').trim());
        }
    }

    return { name, item, ability, moves, pokePasteStringFormat };
}

// Hilfsfunktion: Set validieren
async function validateSet(parsedSet, userid) {
    const { name, item, ability, moves } = parsedSet;
    const pokemon = pokemonData[name.toLowerCase()];

    if (!pokemon) {
        return { success: false, message: `Pokemon "${name}" not found in database.` };
    }

    var query = "SELECT * FROM pokemon p INNER JOIN spieler s ON p.Spieler = s.Name WHERE s.discordid = ? AND p.name = ?";
    var results = await new Promise((resolve, reject) => {
        connection.query(query, [userid, name], function (err, results) {
            if (err) {
                reject("Datenbankfehler: " + err);
            } else {
                resolve(results);
            }
        });
    });

    if (results.length === 0) {
        return { success: false, message: `You have not catched ${name} yet.` };
    }

    query = "SELECT * FROM item i INNER JOIN spieler s ON i.Spieler = s.Name WHERE s.discordid = ? AND i.name = ?";
    var itemResults = await new Promise((resolve, reject) => {
        connection.query(query, [userid, item], function (err, results) {
            if (err) {
                reject("Datenbankfehler: " + err);
            } else {
                resolve(results);
            }
        });
    });

    if (itemResults.length === 0) {
        return { success: false, message: `You do not own the item "${item}".` };
    }

    if (!pokemon.abilities.includes(ability)) {
        return { success: false, message: `Ability "${ability}" is not valid for ${name}.` };
    }

    const possibleMoves = pokemon.moves;
    const moveKeys = new Set(Object.keys(possibleMoves));

    for (const move of moves) {
        const normalizedMove = normalizeMove(move);
        if (!moveKeys.has(normalizedMove)) {
            return { success: false, message: `${name} cannot learn move "${move}".` };
        }
        const moveData = possibleMoves[normalizedMove];
        if (moveData.type === "machine") {
            var query = `
            SELECT t.id AS tm_id, t.attacke, ts.Spieler AS besitzt_tm
            FROM tm t 
            LEFT JOIN tm_spieler ts ON t.id = ts.tm AND ts.Spieler = (Select name from Spieler where discordid = ?)
            WHERE t.attacke = ?
        `;
        
        var tmResults = await new Promise((resolve, reject) => {
            connection.query(query, [userid, move], function (err, results) {
                if (err) {
                    reject("Datenbankfehler: " + err);
                } else {
                    console.log(results)
                    resolve(results);
                }
            });
        });
        
        if (tmResults.length === 0) {
            return { success: false, message: `Move "${move}" does not exist.` };
        }
        
        const tm = tmResults[0];
        if (!tm.besitzt_tm) {
            return {
                success: false,
                message: `${name} can only learn "${move}" via ${tm.tm_id}, which you don't have.`
            };
        }
            
        }
    }


    return { success: true, message: `${name} with ability "${ability}" and selected moves is valid.` };
}

function normalizeMove(move) {
    return move
        .toLowerCase()
        .replace(/\s+/g, '-'); // Alle Leerzeichen durch Bindestriche ersetzen
}

const execute = async (interaction) => {
    const pokepasteText = interaction.options.getString('pokepaste');

    const parsedSet = parsePokepaste(pokepasteText);
    const validationResult = await validateSet(parsedSet, interaction.user.id);

    if (!validationResult.success) {
        await interaction.reply(`Validation failed: ${validationResult.message}`);
        return;
    }
    var query = "Update pokemon p inner join spieler s on p.Spieler = s.Name set pokepaste = ? where p.name = ? and discordid = ?"
    connection.query(query, [parsedSet.pokePasteStringFormat, parsedSet.name, interaction.user.id], (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            return;
        }
        console.log(results.affectedRows)
    })

    await interaction.reply(`Pokemon set registered! ${validationResult.message}`);

};

export default {
    data: commandData,
    execute: execute
};