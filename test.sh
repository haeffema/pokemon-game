#!/bin/bash

# Define the base directory where your sprite folders are located
SPRITES_BASE_DIR="./src/data/sprites"

echo "Starting Git staging of sprite folders..."
echo "Navigating to: $SPRITES_BASE_DIR"

# Check if the directory exists
if [ ! -d "$SPRITES_BASE_DIR" ]; then
  echo "Error: Directory '$SPRITES_BASE_DIR' not found."
  echo "Please ensure the path is correct relative to where you run this script."
  exit 1
fi

# Change to the sprite base directory
cd "$SPRITES_BASE_DIR" || { echo "Failed to change directory to $SPRITES_BASE_DIR. Exiting."; exit 1; }

# Loop through each subdirectory in the current directory (which is now SPRITES_BASE_DIR)
# -maxdepth 1: Only search in the current directory, not sub-subdirectories
# -type d: Only consider directories
# -print0: Print results separated by null characters (handles spaces in names)
# xargs -0: Read null-separated arguments (for handling spaces in names)
find . -maxdepth 1 -type d -print0 | while IFS= read -r -d $'\0' folder; do
  # Skip the current directory '.' itself
  if [ "$folder" = "./" ]; then
    continue
  fi

  # Remove the leading './' from the folder name
  folder_name="${folder#./}"

  echo "Staging folder: $folder_name"
  # Execute git add for the current folder
  # Use --all to stage changes including new, modified, and deleted files within the folder
  git add "$folder_name"

  # You can optionally add a pause here if you want to review after each stage
  # read -p "Press Enter to stage the next folder..."

done

echo "All sprite folders processed. You can now use 'git status' to review staged changes."
echo "Then, use 'git commit' to commit your changes."