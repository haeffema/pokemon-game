import pandas as pd
import json

def filter_pokemon_data(file_path, pokemon_type, tier):
    # JSON-Datei einlesen
    with open(file_path, 'r') as file:
        pokemon_data = json.load(file)

    # Erstelle ein DataFrame aus den Pokémon-Daten
    df = pd.DataFrame(pokemon_data)

    # Filtere Pokémon nach Typ und Tier
    filtered_pokemon = df[(df['type'].apply(lambda x: pokemon_type in x)) & (df['tier'] == tier)]

    return filtered_pokemon.to_dict(orient='records')

import sys

if __name__ == '__main__':
    pokemon_type = sys.argv[1]
    tier = sys.argv[2]
    result = filter_pokemon_data('src/pokemon_data.json', pokemon_type, tier)
    print(json.dumps(result))  # ← Das schickt die Daten an Node.js