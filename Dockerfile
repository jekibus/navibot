FROM oven/bun:latest
WORKDIR /usr/src/app
COPY package.json ./
RUN bun install --production=false
RUN bun run build
RUN bun install --production
ENV NODE_ENV="production"
COPY . .
CMD [ "bun", "start" ]
