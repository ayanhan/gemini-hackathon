FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_ADK_API_URL
ENV VITE_ADK_API_URL=${VITE_ADK_API_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN test -n "${VITE_ADK_API_URL}" || (echo "VITE_ADK_API_URL build arg is required (set via npm run gcp:deploy:web)" >&2 && exit 1)
RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
