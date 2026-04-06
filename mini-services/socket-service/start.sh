#!/bin/bash
cd "$(dirname "$0")"
while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting socket service..." >> /tmp/socket-service.log
  bun index.ts >> /tmp/socket-service.log 2>&1
  EXIT_CODE=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Exited with code $EXIT_CODE, restarting in 2s..." >> /tmp/socket-service.log
  sleep 2
done
