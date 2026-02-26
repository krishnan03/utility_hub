FROM node:18-alpine

# Install ffmpeg for media conversion support
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

# Create uploads directory
RUN mkdir -p uploads/input uploads/output

EXPOSE 3001

CMD ["node", "index.js"]
