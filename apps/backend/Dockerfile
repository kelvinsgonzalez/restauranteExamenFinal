FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
RUN npm install
COPY . .
RUN npm run build --workspace apps/frontend
RUN mkdir -p apps/backend/public && cp -r apps/frontend/dist/* apps/backend/public/
RUN npm run build --workspace apps/backend

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/public ./public
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
