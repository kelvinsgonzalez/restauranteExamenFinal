FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/frontend/package.json apps/frontend/
RUN npm install
COPY . .
WORKDIR /app/apps/frontend
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
