FROM node:18-slim

# Install ffmpeg for media conversion support
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

# Create uploads directory
RUN mkdir -p uploads/input uploads/output

EXPOSE 3001

CMD ["node", "index.js"]
