# Fetching the minified node image on apline linux
FROM node:slim

# Declaring env
ENV NODE_ENV development

# Setting up the work directory
WORKDIR /proxy-service

# Copying all the files in our project
COPY . .

# Installing dependencies
RUN npm install
RUN npm run build

# Starting our application
CMD [ "node", "dist/index.js" ]

# Exposing server port
EXPOSE 3001