#!/bin/bash
cd /home/ett/Downloads/DevLink-Kenyazip
NODE_ENV=development pnpm run build
exec node --env-file artifacts/api-server/.env --enable-source-maps artifacts/api-server/dist/index.mjs
