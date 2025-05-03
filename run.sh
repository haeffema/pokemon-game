#!/bin/bash
cd
cd /root/pokemon-game
timestamp=$(date +"%Y-%m-%d_%H-%M-%S")
npm run bot > "logs/output_$timestamp.log" 2>&1
