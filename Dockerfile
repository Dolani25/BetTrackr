# Use the official Playwright image with Node.js LTS, which includes all necessary browser dependencies
FROM mcr.microsoft.com/playwright/node:lts

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
# The Playwright image already has the browsers installed, so we just need to install node dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the React frontend
# This will create the 'dist' folder
RUN npm run build

# The server.js is configured to use process.env.PORT || 3001
# Render will set the PORT environment variable automatically

# Expose the port the app runs on
EXPOSE 3001

# Start the application
# The "start" script in package.json runs "node server.js"
CMD [ "npm", "start" ]