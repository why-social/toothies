# Fetching the minified node image on apline linux
FROM node:slim

# Declaring env
ENV NODE_ENV development

# Setting up the work directory
WORKDIR /appointment-service

# Import mongodb public key
RUN apt-get update
RUN apt-get install -y gnupg curl && \
    curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
    --dearmor
RUN echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main" | \
    tee /etc/apt/sources.list.d/mongodb-org-8.0.list

RUN apt-get update && apt-get install -y mongodb-org

RUN mkdir -p /data/db

# Copying all the files in our project
COPY . .

# Installing dependencies
RUN npm install
RUN npm run build

# Starting our application
CMD [ "sh", "-c", "mongod --bind_ip_all --dbpath /data/db & node dist/index.js" ]

# Exposing server port
EXPOSE 3001
