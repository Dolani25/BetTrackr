# 1. Use the official Playwright image (matches your Node version)
# This comes pre-baked with browsers (Chromium, Firefox, Webkit) and dependencies.
# IMPORTANT: Check your package.json for your playwright version. 
# If you use playwright@1.49.0, use the tag v1.49.0-jammy.
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /usr/src/app

COPY package*.json ./

# 2. Install Node dependencies
RUN npm install

COPY . .

# 3. Build the React frontend
RUN npm run build

# 4. (Optional but recommended) Set browsers path explicitly if needed, 
# though the official image handles this well.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# 5. Disable sandbox for Render/Cloud environments
ENV PLAYWRIGHT_CHROMIUM_ARGS="--no-sandbox --disable-setuid-sandbox"

EXPOSE 3001

CMD [ "npm", "start" ]
