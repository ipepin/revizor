FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:1.27-alpine

ENV API_ORIGIN=
ENV ROUTER_MODE=hash

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint-app-config.sh /docker-entrypoint.d/40-app-config.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-app-config.sh \
  && chmod +x /docker-entrypoint.d/40-app-config.sh

COPY --from=build /app/dist /usr/share/nginx/html
