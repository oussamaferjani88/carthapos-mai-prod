FROM node:18-bullseye

# Setup Backend
WORKDIR /app/backend

# Copy package.json and install dependencies
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy backend source code
COPY backend .

# Copy the pos-template directory (required for generating new POS instances)
# We copy this to a stable location that the backend can access
WORKDIR /app
COPY pos-template /app/pos-template

# Install dependencies for the template (so we don't have to do it at runtime)
WORKDIR /app/pos-template
# Install ONLY production dependencies to keep image small
# We do NOT run a build here, so we don't need devDependencies or wine
RUN npm install --production --legacy-peer-deps

# Switch back to backend
WORKDIR /app/backend

# Create generated-pos directory with proper permissions
RUN mkdir -p /app/generated-pos && chmod 777 /app/generated-pos

# Ensure Prisma client is generated
RUN npx prisma generate

# Expose the application port
EXPOSE 10000

# Start command
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
