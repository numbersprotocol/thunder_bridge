FROM node:10

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN git config --global url."https://".insteadOf git://
RUN npm install
COPY index.js /app

CMD ["node", "index.js"]
