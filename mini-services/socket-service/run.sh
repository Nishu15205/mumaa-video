#!/bin/bash
cd "$(dirname "$0")"
echo $$ > /tmp/socket-service.pid
exec bun index.ts
