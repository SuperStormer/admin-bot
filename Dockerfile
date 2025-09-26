FROM node:24-bookworm-slim
RUN apt-get update && apt-get -y upgrade

COPY app/package-lock.json app/package.json /app/
RUN cd /app && npx @puppeteer/browsers install chrome --install-deps && npm ci

COPY ./app /app

COPY config.js  /app
WORKDIR /app
CMD ["index.js"]

EXPOSE 8000