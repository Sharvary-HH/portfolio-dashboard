FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @portfolio/api --workspace @portfolio/shared --include-workspace-root

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @portfolio/shared && npm run build -w @portfolio/api
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages/shared/package.json packages/shared/
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/api/package.json apps/api/
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/data apps/api/data

USER node
WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["node", "dist/server.js"]
