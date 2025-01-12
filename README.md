<h1>Toothies</h1>

[![GitLab Wiki Badge](https://img.shields.io/badge/GitLab-Wiki-d94a34.svg?logo=gitlab)](https://git.chalmers.se/courses/dit355/2024/student_teams/dit356_2024_04/toothies.wiki.git)

**Toothies** is a web application that allows residents of Gothenburg, Sweden, to easily find and book dentist appointments through an intuitive graphical user interface. The project aims to simplify the process of booking dental appointments, making it easier for individuals to find available slots within their desired time windows.

## Running the Project

### Components and their location

- Client: `/client`
- Doctor CLI: `/cli`
- API Gateway: `/server/api-gateway`
- Account Service: `/server/account-service`
- Appointment Service: `/server/appointment-service`
- Notification Service: `/server/notification-service`
- Monitoring Service: `/monitoring`

### Setup

Most system components require setup before being ready to be ran. Switch to the service directory:

```sh
cd path/to/component
```

In this directory, provide the required details to start the component by creating a _.env_ file following the template (_example.env_). If there is no _exmaple.env_ file in the component directory, no _.env_ file is needed either.

### Running the Server

#### Running individual components

There are 4 main components that a deployment needs, all are found within `/server`. 

- API Gateway: `/server/api-gateway`
- Account Service: `/server/account-service`
- Appointment Service (_distributed_): `/server/appointment-service`
- Notification Service: `/server/notification-service`

Components marked with (_distributed_) support running multiple instances of the same service at once, to distribute load.

To start any of them, run the following:

```sh
cd path/to/component
npm install
npm build
npm start
```

#### Running the server with Docker

Build and start the containers from the server directory:

```sh
cd server
docker-compose build
docker-compose up
```

Optionally scale up the _appointment-service_ distribution by running:

```sh
docker-compose up --scale appointment-service=number_of_new_instances
```

### Running the Client

#### Client live preview

Run the live preview by using the following commands:

```sh
cd client
npm install
npm run dev
```

The preview will run by default on `localhost:3000`

#### Client deployment

For the simplest deployment, create a production build and copy the output directory to a web server:

```sh
cd client
npm install
npm run build
```

Copy _everything_ within the output directory (`dist/client/`) to a directory on the machine suposed to be hosting the client.

The client can then be accessed by navigating to the `index.html` file found at `dist/client/browser/`.

### Doctor CLI usage

The system provides a command line interface for doctors to interract with. To run the CLI, first you need to install its dependencies:

```sh
cd path/to/cli
npm install
npm link
```

Display help on how to use the CLI by running:

```sh
toothies --help
```

### Monitoring tool usage

Firstly, make sure you have Python 3 installed and added to PATH. The monitoring tool is found at `/monitoring/main.py`. Run it by using:

```sh
cd path/to/monitoring/tool

pip3 install virtualenv
python3 -m venv .

source bin/activate #MacOS/Linux
Scripts/Activate.ps1 #Windows@PowerShell

pip3 install -r requirements.txt

gunicorn main:server
```

## Technologies

- **Client:** Angular, Material Angular, HTML, CSS
- **Server:** TypeScript, Node.js, Express
- **Services:** TypeScript, Node.js,
- **Monitoring:** Plotly Dash
- **Testing:** Locust, Postman
- **Containerization:** Docker
