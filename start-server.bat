@echo off
cd /d "%~dp0"
if not exist node_modules npm install
npx prisma generate
npx prisma db push
npm run dev
