FROM arm64v8/mongo:8.0-noble

WORKDIR /appointment-service

# Set up CURL
RUN apt-get update && apt-get install -y curl

# Set up Node
# https://stackoverflow.com/a/62838796
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION v22.13.0

RUN mkdir -p /usr/local/nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"

ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
ENV PATH $NODE_PATH:$PATH

# Copying all the files in our project
COPY . .

# Installing dependencies
RUN npm install
RUN npm run build

# Starting our application
CMD [ "sh", "-c", "mongod --bind_ip_all --dbpath /data/db & node dist/index.js" ]

# Exposing server port
EXPOSE 3001
