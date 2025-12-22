# Use the official Playwright image with Node.js LTS, which includes all necessary browser dependencies
FROM node:20-bookworm

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
# The Playwright image already has the browsers installed, so we just need to in# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Install Playwright's system dependencies and browsers
# This is necessary for the scraping functionality
# We set the PLAYWRIGHT_BROWSERS_PATH to a known location for reliability
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/src/app/.ms-playwright
RUN npx playwright install --with-deps

# Build the React frontend
# This will create the 'dist' folder
RUN npm run buildd

# The server.js is configured to use process.env.PORT || 3001
# Render will set the PORT environment variable automatically

# Set environment variable to disable the Chromium sandbox, required for most cloud environments
ENV PLAYWRIGHT_CHROMIUM_ARGS="--no-sandbox --disable-setuid-sandbox"

# Expose the port the app runs on
EXPOSE 3001

# Start the application
# The "start" script in package.json runs "node server.js"
CMD [ "npm", "start" ]