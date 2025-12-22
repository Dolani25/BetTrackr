# 1. Use the official Playwright image matching your package.json version
# This includes Node.js, Playwright 1.57.0, and all browser binaries.
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

# 2. Set the working directory
WORKDIR /usr/src/app

# 3. Copy package files first (better for caching)
COPY package*.json ./

# 4. Install dependencies
# Using 'npm ci' is faster and more reliable for builds than 'npm install'
RUN npm ci

# 5. Copy the rest of your application code
COPY . .

# 6. Build the Vite frontend
RUN npm run build

# 7. Expose the port your server uses
EXPOSE 8000

# 8. Start the server
CMD ["npm", "start"]
