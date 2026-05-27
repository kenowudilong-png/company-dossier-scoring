FROM node:24 AS deps
WORKDIR /app
RUN corepack enable
COPY package.json ./package.json
RUN pnpm config set dangerouslyAllowAllBuilds true && pnpm install --prod=false

FROM node:24 AS runner
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
CMD ["pnpm", "start"]
