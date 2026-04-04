#!/bin/bash

# Claude Notification Script for macOS
# Usage: ./notify.sh [type] [message]

NOTIFICATION_TYPE=${1:-"info"}
MESSAGE=${2:-"Claude needs attention"}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOUNDS_DIR="$SCRIPT_DIR/sounds"

# Function to play audio with prewarm
play_audio_with_prewarm() {
    local audio_file="$1"
    # First play: slightly longer to properly wake audio system
    afplay "$audio_file" -t 0.01 2>/dev/null || true
    # Longer delay to ensure system is ready
    sleep 0.2
    # Second play: full audio (not in background for better timing)
    afplay "$audio_file"
}

case $NOTIFICATION_TYPE in
    "complete")
        # Task completion sound
        osascript -e "display notification \"$MESSAGE\" with title \"Claude\" subtitle \"Task Complete\""
        play_audio_with_prewarm "$SOUNDS_DIR/complete.mp3"
        ;;
    "attention")
        # Attention required sound
        osascript -e "display notification \"$MESSAGE\" with title \"Claude\" subtitle \"Attention Required\""
        play_audio_with_prewarm "$SOUNDS_DIR/attention.mp3"
        ;;
    "error")
        # Error sound
        osascript -e "display notification \"$MESSAGE\" with title \"Claude\" subtitle \"Error\""
        play_audio_with_prewarm "$SOUNDS_DIR/error.mp3"
        ;;
    "progress")
        # Long running task sound
        osascript -e "display notification \"$MESSAGE\" with title \"Claude\" subtitle \"Working...\""
        play_audio_with_prewarm "$SOUNDS_DIR/progress.mp3"
        ;;
    "subagent")
        # Sub agent completion sound
        osascript -e "display notification \"$MESSAGE\" with title \"Claude\" subtitle \"Sub Agent Complete\""
        play_audio_with_prewarm "$SOUNDS_DIR/subagent.mp3"
        ;;
    *)
        # Default notification (neutral system sound)
        osascript -e "display notification \"$MESSAGE\" with title \"Claude\""
        afplay /System/Library/Sounds/Ping.aiff &
        ;;
esac
