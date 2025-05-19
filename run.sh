#!/bin/bash

cd /root/pokemon-game

log_folder="logs"
days_to_keep=3

find "$log_folder" -type f -name "output_*.log" -print0 | while IFS= read -r -d $'\0' file; do
  filename=$(basename "$file")
  date_part=$(echo "$filename" | awk -F'_' '{print $2}')

  file_timestamp=$(date -d "$date_part" +%s)

  cutoff_timestamp=$(date -d "-${days_to_keep} days" +%s)

  if [ "$file_timestamp" -lt "$cutoff_timestamp" ]; then
    rm "$file"
  fi
done

git pull

timestamp=$(date +"%Y-%m-%d_%H-%M-%S")

npm run bot > "logs/output_$timestamp.log" 2>&1

echo "Updated bot, pulled latest changes, and started with new logs."
