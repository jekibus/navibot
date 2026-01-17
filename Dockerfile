FROM oven/bun:latest
WORKDIR /usr/src/app
COPY package.json ./
RUN bun install
RUN bun run build
ENV NODE_ENV="production"
COPY . .
CMD [ "bun", "start" ]
