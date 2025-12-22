FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./

RUN npm ci

# Install playwright browsers and dependencies
RUN npx playwright install --with-deps chromium

COPY . .

RUN npm run build

EXPOSE 8000

CMD ["npm", "start"]
