# ---- build ----
FROM node:24 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# node_modules carried from the build stage (keeps native bcrypt binary intact)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts
COPY package*.json ./
EXPOSE 8080
CMD ["node", "dist/main.js"]
