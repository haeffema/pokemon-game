import pandas as pd
import json

# Lade die Pokémon-Daten aus der JSON-Datei
file_path = 'pokemon_data.json'

# JSON-Datei einlesen
with open(file_path, 'r') as file:
    pokemon_data = json.load(file)

# Erstelle ein DataFrame aus den Pokémon-Daten
df = pd.DataFrame(pokemon_data)

# Beispiel: Filtere Pokémon nach Typ "Fire"
fire_pokemon = df[df['type'].apply(lambda x: 'Fire' in x)]

# Gebe das gefilterte DataFrame aus
print(fire_pokemon)