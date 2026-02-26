# Stage 1: Build the React app
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add .mjs MIME type for ES module scripts (PDF.js worker, etc.)
RUN sed -i 's|application/javascript                           js;|application/javascript                           js mjs;|' /etc/nginx/mime.types

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
