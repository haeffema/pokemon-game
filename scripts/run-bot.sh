#!/bin/bash

cd /root/pokemon-game

log_folder="logs/bot"
days_to_keep=3

find "$log_folder" -type f -name "*.log" -print0 | while IFS= read -r -d $'\0' file; do
  filename=$(basename "$file")
  # Extract the YYYY-MM-DD part from the filename
  date_part=$(echo "$filename" | cut -d'_' -f1)

  file_timestamp=$(date -d "$date_part" +%s)

  cutoff_timestamp=$(date -d "-${days_to_keep} days" +%s)

  if [ "$file_timestamp" -lt "$cutoff_timestamp" ]; then
    rm "$file"
  fi
done

timestamp=$(date +"%Y-%m-%d_%H-%M-%S")

npm run bot > "$log_folder/$timestamp.log" 2>&1
