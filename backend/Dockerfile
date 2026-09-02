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

# Ensure main Prisma client is generated
RUN npx prisma generate

# Ensure the BI warehouse Prisma client is generated. The schema outputs to
# backend/prisma-warehouse-generated (a gitignored sibling), which
# prisma-warehouse/client.js requires — so it must be built here.
RUN npx prisma generate --schema=prisma-warehouse/schema.prisma

# Expose the application port
EXPOSE 10000

# Start command:
#  1) apply the main Prisma migrations to the app database
#  2) sync the BI warehouse schema (prisma-warehouse has no committed migrations,
#     so use `db push` — non-destructive, creates missing Dim/Fact tables)
#  3) boot the server
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db push --schema=prisma-warehouse/schema.prisma && node server.js"]
