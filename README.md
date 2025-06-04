# Transcendence

## Table of Contents
- [Transcendence](#transcendence)
  - [Table of Contents](#table-of-contents)
  - [Project Structure](#project-structure)
  - [API list](#api-list)
    - [Server Pong](#server-pong)
    - [AI Pong](#ai-pong)
    - [User Service](#user-service)
    - [Chat](#chat)
  - [Prerequisites](#prerequisites)
  - [Building the Project](#building-the-project)
  - [Running the Project](#running-the-project)
    - [Running Specific Services](#running-specific-services)
  - [Stopping and Destroying the Project](#stopping-and-destroying-the-project)
  - [Data structure](#data-structure)

## Project Structure

![Project Structure Diagram](doc/project_structure(transcendence).png)

## API list
  - **Documentation format with examples**
| Champ                      | Description                                                                 | Exemples de Valeurs                |
|----------------------------|-----------------------------------------------------------------------------|------------------------------------|
| **Nom de l'API**           | Nom de la fonctionnalité ou de l'action de l'API                            | Connexion utilisateur              |
| **Endpoint**               | URL de l’API                                                                | `/user-service/login/`             |
| **Méthode**                | Méthode HTTP utilisée                                                       | `POST`                             |
| **Description**            | Brève description de ce que fait l’API                                      | Authentifie un utilisateur         |
| **Authentification**       | Type d’authentification requise                                             | Aucune / Token / JWT / Session     |
| **Paramètres de Requête**  | Paramètres attendus dans la requête                                         |                                    |
| - Nom                      | Nom du paramètre                                                            | `username`                         |
| - Type                     | Type de donnée                                                              | `string`                           |
| - Obligatoire              | Oui / Non                                                                   | Oui                                |
| - Description              | Description du paramètre                                                    | Nom d’utilisateur                  |
| - Exemple                  | Exemple de valeur                                                           | `alice`                            |
| **Exemple de Requête**     | Exemple complet de requête (curl, JSON, etc.)                               | `curl -X POST ...`                 |
| **Réponse**                | Détails sur la réponse attendue                                             |                                    |
| - Code de Statut           | Code HTTP de succès                                                         | `200 OK`                           |
| - Corps                    | Exemple de corps de réponse                                                 | `{ "token": "..." }`               |
| - Description des Champs   | Explication des champs du corps de réponse                                  | `token`: jeton d’authentification  |
| **Réponses d'Erreur**      | Codes et exemples de réponses d’erreur                                      |                                    |
| - Code de Statut           | Code HTTP d’erreur                                                          | `400 Bad Request`                  |
| - Corps                    | Exemple de corps d’erreur                                                   | `{ "error": "Invalid credentials" }`|
| **Remarques**              | Informations complémentaires, limitations, etc.                             |                                    |

  - **Copy this form to fill in**
| Champ                      | Description                                                                 | Exemples de Valeurs                |
|----------------------------|-----------------------------------------------------------------------------|------------------------------------|
| **Nom de l'API**           |                                       |                                    |
| **Endpoint**               |                                       |                                    |
| **Méthode**                |                                       |                                    |
| **Description**            |                                       |                                    |
| **Authentification**       |                                       |                                    |
| **Paramètres de Requête**  |                                       |                                    |
| - Nom                      |                                       |                                    |
| - Type                     |                                       |                                    |
| - Obligatoire              |                                       |                                    |
| - Description              |                                       |                                    |
| - Exemple                  |                                       |                                    |
| **Exemple de Requête**     |                                       |                                    |
| **Réponse**                |                                       |                                    |
| - Code de Statut           |                                       |                                    |
| - Corps                    |                                       |                                    |
| - Description des Champs   |                                       |                                    |
| **Réponses d'Erreur**      |                                       |                                    |
| - Code de Statut           |                                       |                                    |
| - Corps                    |                                       |                                    |
| **Remarques**              |                                       |                                    |
### Server Pong

This document describes the API endpoints for the `server_pong` Django application, which facilitates real-time multiplayer Pong game simulations. The API provides functionalities for managing game sessions, retrieving simulation states, and handling real-time communication.

---

**1. Get Simulation State**

Retrieves the current state of a specific game simulation.

| Field                 | Description                                                  | Example Value                                  |
| :-------------------- | :----------------------------------------------------------- | :--------------------------------------------- |
| **API Name** | `GetSimulationState`                                         |                                                |
| **Endpoint** | `/api/simulation-state/`                                     | `https://transcendence.42.fr:8443/api/simulation-state/` |
| **Method** | `GET`                                                        |                                                |
| **Description** | Fetches the current state of a game simulation using an API key. The state is retrieved from cache. | Retrieves current game data.                   |
| **Authentication** | Via `apikey` in query parameters.                            | API Key                                        |
| **Query Parameters** |                                                              |                                                |
| - Name                | `apikey`                                                     | `your_api_key_123`                             |
| - Type                | String                                                       | `String`                                       |
| - Required            | Yes                                                          | `Yes`                                          |
| - Description         | The unique API key for the game simulation.                  | Key identifying the game session.              |
| - Example             | `?apikey=a1b2c3d4-e5f6-7890-1234-abcdefghijkl`               | `?apikey=xyz789`                               |
| **Example Request** | `GET /api/simulation-state/?apikey=a1b2c3d4-e5f6-7890-1234-abcdefghijkl` |                                                |
| **Response (200 OK)** |                                                              |                                                |
| - Body                | `{ "score": 5, "ball_pos": [100, 200], "player1_pos": 50, "player2_pos": 150 }` | `{ "status": "running", "players": ["P1", "P2"] }` |
| - Field Description   | `score`: Current score. `ball_pos`: Ball position. `player1_pos`: Player 1 paddle position. `player2_pos`: Player 2 paddle position. | Full simulation state.                         |
| **Error Responses** |                                                              |                                                |
| - Status Code         | `400 Bad Request`                                            |                                                |
| - Body                | `{ "error": "API key manquante" }`                           |                                                |
| - Status Code         | `404 Not Found`                                              |                                                |
| - Body                | `{ "error": "Simulation not found" }`                        |                                                |
| **Notes** | Retrieves the state from a Django cache.                     | Cache is used for performance.                 |

---

**2. Server-Sent Events (SSE) Stream**

Provides real-time updates and game state changes via Server-Sent Events.

| Field                 | Description                                                  | Example Value                                  |
| :-------------------- | :----------------------------------------------------------- | :--------------------------------------------- |
| **API Name** | `SSEStream`                                                  |                                                |
| **Endpoint** | `/api/sse/`                                                  | `https://transcendence.42.fr:8443/api/sse/`             |
| **Method** | `GET`                                                        |                                                |
| **Description** | Establishes a persistent connection to receive real-time updates (game state, player actions) via Server-Sent Events. Internally connects to a WebSocket. | Provides a continuous stream of game data.     |
| **Authentication** | Via `apikey` and `idplayer` in query parameters.             | API Key, Player ID                             |
| **Query Parameters** |                                                              |                                                |
| - Name                | `apikey`                                                     | `your_api_key_123`                             |
| - Type                | String                                                       | `String`                                       |
| - Required            | Yes                                                          | `Yes`                                          |
| - Description         | The unique API key for the game simulation.                  | Key identifying the game session.              |
| - Example             | `?apikey=a1b2c3d4-e5f6-7890-1234-abcdefghijkl`               | `?apikey=xyz789`                               |
| - Name                | `idplayer`                                                   | `1`                                            |
| - Type                | Integer                                                      | `Integer`                                      |
| - Required            | Yes                                                          | `Yes`                                          |
| - Description         | The unique identifier for the player associated with this connection. | Player identifier.                             |
| - Example             | `&idplayer=1`                                                | `&idplayer=2`                                  |
| - Name                | `ai`                                                         | `true`                                         |
| - Type                | Boolean (String)                                             | `String ("true" or "false")`                   |
| - Required            | No                                                           | `No`                                           |
| - Description         | Indicates if the player is an AI.                            | Indicates if an AI is playing.                 |
| - Example             | `&ai=true`                                                   | `&ai=false`                                    |
| **Example Request** | `GET /api/sse/?apikey=a1b2c3d4-e5f6-7890-1234-abcdefghijkl&idplayer=1&ai=false` |                                                |
| **Response (200 OK)** |                                                              |                                                |
| - Body                | `data: { "score": 5, "ball_pos": [100, 200] }\n\ndata: { "action": "move_paddle", "player": 1, "direction": "up" }\n\n` (Streaming HTTP response) | `data: { "event": "update", "value": "..." }` |
| - Field Description   | The response body is an event stream, with each event prefixed by `data:`. Data are JSON objects representing game state or actions. | Various JSON data for updates.                 |
| **Error Responses** |                                                              |                                                |
| - Status Code         | `400 Bad Request`                                            |                                                |
| - Body                | `{ "error": "API key manquante" }`                           |                                                |
| - Status Code         | `500 Internal Server Error`                                  |                                                |
| - Body                | `data: WebSocket stop, error : ...\n\n`                      | `data: WebSocket connection error`             |
| **Notes** | Uses `websockets` and `StreamingHttpResponse`. Ensure the SSL certificate (`/certs/fullchain.crt`) is accessible and valid for the internal WebSocket connection. | Designed for real-time client updates.         |

---

**3. Set API Key for Single Player**

Registers an API key for a single-player game session.

| Field                 | Description                                                  | Example Value                                  |
| :-------------------- | :----------------------------------------------------------- | :--------------------------------------------- |
| **API Name** | `SetApiKeySP`                                                |                                                |
| **Endpoint** | `/api/set-api-key-sp/`                                       | `https://transcendence.42.fr:8443/api/set-api-key-sp/` |
| **Method** | `POST`                                                       |                                                |
| **Description** | Registers an API key for a new single-player game, marking it as playable. | Registers a key for single-player game.        |
| **Authentication** | None (CSRF exempted)                                         | `None`                                         |
| **Request Parameters** | (JSON Body)                                                  |                                                |
| - Name                | `apiKey`                                                     | `a1b2c3d4-e5f6-7890-1234-abcdefghijkl`         |
| - Type                | String                                                       | `String`                                       |
| - Required            | Yes                                                          | `Yes`                                          |
| - Description         | The API key to be registered.                                | Game session key.                              |
| - Example             | `{ "apiKey": "a1b2c3d4-e5f6-7890-1234-abcdefghijkl" }`       | `{ "apiKey": "xyz789" }`                       |
| **Example Request** | `POST /api/set-api-key-sp/` <br> Body: `{ "apiKey": "a1b2c3d4-e5f6-7890-1234-abcdefghijkl" }` |                                                |
| **Response (200 OK)** |                                                              |                                                |
| - Body                | `{ "playable": "Game can start" }`                           | `{ "playable": "Game can start" }`             |
| - Field Description   | `playable`: Message confirming that the game can start.      | Confirmation message.                          |
| **Error Responses** | Not explicitly handled in code.                              | `Not specified`                                |
| **Notes** | Uses global lists/dictionaries (`apiKeys`, `dictApiSp`) for key tracking. | CSRF exempted.                                 |

---

**4. Set API Key for Multi Player**

Allows a player to join an existing multiplayer game.

| Field                 | Description                                                  | Example Value                                  |
| :-------------------- | :----------------------------------------------------------- | :--------------------------------------------- |
| **API Name** | `SetApiKey`                                                  |                                                |
| **Endpoint** | `/api/set-api-key/`                                          | `https://transcendence.42.fr:8443/api/set-api-key/`     |
| **Method** | `POST`                                                       |                                                |
| **Description** | Allows a player to join an existing game using an API key. The game becomes playable once more than one player has joined. | Joins an existing game session.                |
| **Authentication** | None (CSRF exempted)                                         | `None`                                         |
| **Request Parameters** | (JSON Body)                                                  |                                                |
| - Name                | `apiKey`                                                     | `a1b2c3d4-e5f6-7890-1234-abcdefghijkl`         |
| - Type                | String                                                       | `String`                                       |
| - Required            | Yes                                                          | `Yes`                                          |
| - Description         | The API key of the game to join.                             | Game session key.                              |
| - Example             | `{ "apiKey": "a1b2c3d4-e5f6-7890-1234-abcdefghijkl" }`       | `{ "apiKey": "xyz789" }`                       |
| **Example Request** | `POST /api/set-api-key/` <br> Body: `{ "apiKey": "a1b2c3d4-e5f6-7890-1234-abcdefghijkl" }` |                                                |
| **Response (200 OK)** |                                                              |                                                |
| - Body                | `{ "playable": "Game can start" }` or `{ "playable": "Need more player" }` | `{ "playable": "Game can start" }`             |
| - Field Description   | `playable`: Message indicating if the game is playable or if more players are needed. | Game playability status.                       |
| **Error Responses** |                                                              |                                                |
| - Status Code         | `200 OK` (Should ideally be `404 Not Found` or `400 Bad Request`) | `200` (error)                                  |
| - Body                | `{ "playable": "Room <apiKey> doesn't Exists" }`             | `{ "playable": "Room abc doesn't Exists" }`    |
| **Notes** | Current logic returns `200 OK` even if the room doesn't exist, which is not RESTful. A `404 Not Found` or `400 Bad Request` would be more appropriate. | CSRF exempted. Uses global lists/dictionaries. |

---

**5. Is Game Playable?**

Checks if a specific game session is playable.

| Field                 | Description                                                  | Example Value                                  |
| :-------------------- | :----------------------------------------------------------- | :--------------------------------------------- |
| **API Name** | `IsGamePlayable`                                             |                                                |
| **Endpoint** | `/api/is-game-playable/`                                     | `https://transcendence.42.fr:8443/api/is-game-playable/` |
| **Method** | `POST`                                                       |                                                |
| **Description** | Checks if a specific game is playable (i.e., has more than one player joined). | Checks if the game can start.                  |
| **Authentication** | None (CSRF exempted)                                         | `None`                                         |
| **Request Parameters** | (JSON Body)                                                  |                                                |
| - Name                | `apiKey`                                                     | `a1b2c3d4-e5f6-7890-1234-abcdefghijkl`         |
| - Type                | String                                                       | `String`                                       |
| - Required            | Yes                                                          | `Yes`                                          |
| - Description         | The API key of the game to check.                            | Game session key.                              |
| - Example             | `{ "apiKey": "a1b2c3d4-e5f6-7890-1234-abcdefghijkl" }`       | `{ "apiKey": "xyz789" }`                       |
| **Example Request** | `POST /api/is-game-playable/` <br> Body: `{ "apiKey": "a1b2c3d4-e5f6-7890-1234-abcdefghijkl" }` |                                                |
| **Response (200 OK)** |                                                              |                                                |
| - Body                | `{ "playable": "Game can start" }` or `{ "playable": "Need more player" }` | `{ "playable": "Game can start" }`             |
| - Field Description   | `playable`: Message indicating if the game is playable or if more players are needed. | Game playability status.                       |
| **Error Responses** | If `apiKey` is not in `dictApi`, a `KeyError` will result in a server error (500). | `500 Internal Server Error`                    |
| **Notes** | Current logic relies on global `dictApi` state, which could be problematic in a distributed environment. | CSRF exempted.                                 |

---

**6. Get New API Key**

Generates a new, unique API key for a game session.

| Field                 | Description                                                  | Example Value                                  |
| :-------------------- | :----------------------------------------------------------- | :--------------------------------------------- |
| **API Name** | `GetNewApiKey`                                               |                                                |
| **Endpoint** | `/api/get-api-key/` (Routed via `apiKeyManager`)             | `https://transcendence.42.fr:8443/api/get-api-key/`     |
| **Method** | `GET`                                                        |                                                |
| **Description** | Generates a unique API key (UUID) and adds it to the list of unplayable keys. | Creates a unique identifier for a new game.    |
| **Authentication** | None                                                         | `None`                                         |
| **Query Parameters** | None                                                         | `None`                                         |
| **Example Request** | `GET /api/get-api-key/`                                      |                                                |
| **Response (200 OK)** |                                                              |                                                |
| - Body                | `{ "api_key": "new_uuid_api_key" }`                         | `{ "api_key": "c7f8a9b0-1234-5678-90ab-cdef01234567" }` |
| - Field Description   | `api_key`: The newly generated API key.                      | The unique key.                                |
| **Error Responses** | Not explicitly handled in code.                              | `Not specified`                                |
| **Notes** | This API key is initially marked as "unplayable" until other players join via `setApiKey`. | Uses `uuid.uuid4()`.                           |

---

**7. Send New JSON (to WebSocket Group)**

Forwards a JSON message received via HTTP to a WebSocket group.

| Field                 | Description                                                  | Example Value                                  |
| :-------------------- | :----------------------------------------------------------- | :--------------------------------------------- |
| **API Name** | `SendJSONToGroup`                                            |                                                |
| **Endpoint** | `/api/send-new-json/`                                        | `https://transcendence.42.fr:8443/api/send-new-json/`   |
| **Method** | `POST`                                                       |                                                |
| **Description** | Receives JSON data via HTTP and relays it to a WebSocket group of clients (identified by the API key). | Relays game messages to connected clients.     |
| **Authentication** | None (CSRF exempted)                                         | `None`                                         |
| **Request Parameters** | (JSON Body)                                                  |                                                |
| - Name                | `apiKey`                                                     | `a1b2c3d4-e5f6-7890-1234-abcdefghijkl`         |
| - Type                | String                                                       | `String`                                       |
| - Required            | Yes                                                          | `Yes`                                          |
| - Description         | The API key of the target WebSocket group.                   | Game session key.                              |
| - Example             | `{ "apiKey": "...", "message": { "action": "move", "player": 1, "data": "left" } }` | `{ "apiKey": "xyz789", "message": { "score": 10 } }` |
| - Name                | `message`                                                    | `{ "action": "move", "player": 1, "data": "left" }` |
| - Type                | JSON Object                                                  | `JSON Object`                                  |
| - Required            | Yes                                                          | `Yes`                                          |
| - Description         | The content of the message to be sent to clients.            | Event data.                                    |
| - Example             | `{ "action": "move", "player": 1, "data": "left" }`          | `{ "type": "chat", "text": "hello" }`          |
| **Example Request** | `POST /api/send-new-json/` <br> Body: `{ "apiKey": "a1b2c3d4-e5f6-7890-1234-abcdefghijkl", "message": { "action": "move", "player": 1, "data": "left" } }` |                                                |
| **Response (204 No Content)** |                                                              |                                                |
| - Body                | Empty                                                        | `Empty`                                        |
| - Field Description   | `204` status indicates the request was successful with no content to return. | None.                                          |
| **Error Responses** | Not explicitly handled for `KeyError` or other issues. If `apiKey` is `None`, `channel_layer.group_send` is not called. | Potentially `500 Internal Server Error` for internal errors. |
| **Notes** | This API acts as an HTTP gateway to the WebSocket messaging system via Django Channels. | CSRF exempted.                                 |

---

**8. Forfeit User**

Manages a player's forfeiture in a game session.

| Field                 | Description                                                  | Example Value                                  |
| :-------------------- | :----------------------------------------------------------- | :--------------------------------------------- |
| **API Name** | `ForfeitUser`                                                |                                                |
| **Endpoint** | `/api/forfeit-user/`                                         | `https://transcendence.42.fr:8443/api/forfeit-user/`    |
| **Method** | `GET` (A `POST` or `DELETE` method would be more semantically appropriate for an action.) | `GET`                                          |
| **Description** | Allows a player to forfeit a specific game, triggering a "forfeit" message to other WebSocket clients in the group. The game session is then cleaned up. | A player leaves the game.                      |
| **Authentication** | Via `apikey` and `idplayer` in query parameters.             | API Key, Player ID                             |
| **Query Parameters** |                                                              |                                                |
| - Name                | `apikey`                                                     | `a1b2c3d4-e5f6-7890-1234-abcdefghijkl`         |
| - Type                | String                                                       | `String`                                       |
| - Required            | Yes                                                          | `Yes`                                          |
| - Description         | The API key of the game session.                             | Game session key.                              |
| - Example             | `?apikey=a1b2c3d4-e5f6-7890-1234-abcdefghijkl`               | `?apikey=xyz789`                               |
| - Name                | `idplayer`                                                   | `1`                                            |
| - Type                | Integer                                                      | `Integer`                                      |
| - Required            | Yes                                                          | `Yes`                                          |
| - Description         | The ID of the player forfeiting.                             | Player identifier.                             |
| - Example             | `&idplayer=1`                                                | `&idplayer=2`                                  |
| **Example Request** | `GET /api/forfeit-user/?apikey=a1b2c3d4-e5f6-7890-1234-abcdefghijkl&idplayer=1` |                                                |
| **Response (204 No Content)** |                                                              |                                                |
| - Body                | Empty                                                        | `Empty`                                        |
| - Field Description   | Indicates the request was successfully processed with no content to return. | None.                                          |
| **Error Responses** | Not explicitly handled in code. Errors (e.g., `KeyError` if key not found) are handled internally without explicit HTTP error responses. | Potentially `500 Internal Server Error` if the key doesn't exist in `dictApi` or `dictApiSp`. |
| **Notes** | A `POST` or `DELETE` method would be more semantically appropriate for a state-changing action. Uses global lists/dictionaries for state. | Handles API keys for both single and multiplayer games. |

---

**9. Disconnect User**

Disconnects a user from a game session.

| Field                 | Description                                                  | Example Value                                  |
| :-------------------- | :----------------------------------------------------------- | :--------------------------------------------- |
| **API Name** | `DisconnectUser`                                             |                                                |
| **Endpoint** | `/api/disconnect-user/`                                      | `https://transcendence.42.fr:8443/api/disconnect-user/` |
| **Method** | `GET` (A `POST` or `DELETE` method would be more semantically appropriate for an action.) | `GET`                                          |
| **Description** | Disconnects a user from a specific game, triggering a "disconnect" message to other WebSocket clients in the group. The game session is then cleaned up. | A player disconnects from the game.            |
| **Authentication** | Via `apikey` in query parameters.                            | API Key                                        |
| **Query Parameters** |                                                              |                                                |
| - Name                | `apikey`                                                     | `a1b2c3d4-e5f6-7890-1234-abcdefghijkl`         |
| - Type                | String                                                       | `String`                                       |
| - Required            | Yes                                                          | `Yes`                                          |
| - Description         | The API key of the game session to disconnect from.          | Game session key.                              |
| - Example             | `?apikey=a1b2c3d4-e5f6-7890-1234-abcdefghijkl`               | `?apikey=xyz789`                               |
| **Example Request** | `GET /api/disconnect-user/?apikey=a1b2c3d4-e5f6-7890-1234-abcdefghijkl` |                                                |
| **Response (204 No Content)** |                                                              |                                                |
| - Body                | Empty                                                        | `Empty`                                        |
| - Field Description   | Indicates the request was successfully processed with no content to return. | None.                                          |
| **Error Responses** | Not explicitly handled in code. Errors (e.g., `KeyError` if key not found) are handled internally without explicit HTTP error responses. | Potentially `500 Internal Server Error` if the key doesn't exist in `dictApi` or `dictApiSp`. |
| **Notes** | A `POST` or `DELETE` method would be more semantically appropriate for a state-changing action. Uses global lists/dictionaries for state. | Handles API keys for both single and multiplayer games. |
### AI Pong

### User Service

### Chat

## Prerequisites

Before you begin, ensure you have the following installed
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Building the Project

You can build the entire project or specific components.

1.  **Build All Services (Transcendence and ELK stack):**
    This command builds all Docker images for the main Transcendence services and the ELK (Elasticsearch, Kibana, Logstash) stack.

    ```bash
    make build
    ```

2.  **Build Main Transcendence Services (without ELK stack):**
    This command builds only the core Transcendence services (`user_service`, `ai_pong`, `server_pong`, `nginx_modsecurity`, `postgres`, `redis`, `game_redis`).

    ```bash
    make build-main
    ```

3.  **Build ELK Stack:**
    This command builds Docker images for the ELK stack components (`elasticsearch`, `kibana`, `logstash`).

    ```bash
    make build-elk
    ```

4.  **Build User Service Components:**
    Specifically builds `user_service`, `nginx_modsecurity`, `postgres`, `redis`.

    ```bash
    make build-user
    ```

5.  **Build Game Service Components:**
    Specifically builds `ai_pong`, `server_pong`, `game_redis`, `nginx_modsecurity`, `postgres`.

    ```bash
    make build-game
    ```

6.  **Rebuild All Services (No Cache):**
    This command rebuilds all Docker images from scratch, ignoring cached layers. Useful for ensuring a clean build.

    ```bash
    make no-cache
    ```

## Running the Project

You can start the entire project or specific sets of services.

1.  **Start All Services (Transcendence and ELK stack):**
    This command builds (if not already built) and starts all services defined in `docker-compose.yml`.

    ```bash
    make up
    ```

    Alternatively, if services are already built and stopped, you can just start them:

    ```bash
    make start
    ```

### Running Specific Services

You can also run or start specific groups of containers:

-   **Start Main Transcendence Services:**
    ```bash
    make up-main
    # Or if already built and stopped:
    make start-main
    ```

-   **Start ELK Stack:**
    ```bash
    make up-elk
    # Or if already built and stopped:
    make start-elk
    ```

-   **Start User Service Components:**
    ```bash
    make up-user
    # Or if already built and stopped:
    make start-user
    ```

-   **Start Game Service Components:**
    ```bash
    make up-game
    # Or if already built and stopped:
    make start-game
    ```

## Stopping and Destroying the Project

1.  **Stop All Running Containers:**
    This command stops all services defined in `docker-compose.yml` but keeps their data volumes and networks.

    ```bash
    make down
    ```

2.  **Destroy All Containers, Volumes, and Images:**
    This command stops and removes all containers, networks, and volumes associated with the project. It also removes all Docker images (`--rmi all`) and any anonymous volumes (`-v`). Use this for a clean slate.

    ```bash
    make destroy
    ```

3.  **Remove all unused docker data from the system**
    This command will clean your docker environment completely.

    ```bash
    make prune
    ```

## Data structure
