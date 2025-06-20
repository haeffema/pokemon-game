#!/bin/bash

cd /root/pokemon-game

log_folder="logs"
days_to_keep=3

find "$log_folder" -type f -name "bot-*.log" -print0 | while IFS= read -r -d $'\0' file; do
  filename=$(basename "$file")
  date_part=$(echo "$filename" | awk -F'_' '{print $2}')

  file_timestamp=$(date -d "$date_part" +%s)

  cutoff_timestamp=$(date -d "-${days_to_keep} days" +%s)

  if [ "$file_timestamp" -lt "$cutoff_timestamp" ]; then
    rm "$file"
  fi
done

timestamp=$(date +"%Y-%m-%d_%H-%M-%S")

npm run bot > "$log_folder/bot-$timestamp.log" 2>&1
