#!/bin/bash
# Start socket service
cd /home/z/my-project/mini-services/socket-service
nohup bun index.ts > /home/z/my-project/socket.log 2>&1 &
echo $! > /home/z/my-project/.socket.pid

# Start Next.js
cd /home/z/my-project
nohup npx next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
echo $! > /home/z/my-project/.next.pid

echo "Both services started"
