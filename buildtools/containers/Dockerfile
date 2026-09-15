FROM node:25-alpine AS base
RUN apk add --no-cache ca-certificates curl bash

FROM base AS build
WORKDIR /usr/src/app
ENV PATH="/usr/src/app/node_modules/.bin:$PATH"
ENV FORCE_COLOR=1
ENV VERDACCIO_URL=http://verdaccio:4873
ENV NPM_CONFIG_USERCONFIG=/usr/src/app/buildtools/.npmrc.local

RUN curl -fsSL https://vite.plus | bash
ENV PATH="/root/.vite-plus/bin:$PATH"

COPY . .
RUN --mount=type=cache,id=npm,target=/root/.npm vp install
