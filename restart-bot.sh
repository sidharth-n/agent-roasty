#!/bin/bash

# Set smaller embedding model
export OLLAMA_EMBEDDING_MODEL="nomic-embed-text"

echo "Stopping all existing processes..."

# Kill all node processes (except IDE ones)
pkill -f "pnpm run dev"
pkill -f "node.*characters/roasty"

# Give processes time to shut down
sleep 2

# Double check for any lingering processes
pkill -9 -f "pnpm run dev"
pkill -9 -f "node.*characters/roasty"

echo "Starting bot..."
# Start the bot
pnpm run dev --characters="characters/roasty.character.json" 