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
| :------------------------- | :-------------------------------------------------------------------------- | :--------------------------------- |
| **Nom de l'API** |                                                                             |                                    |
| **Endpoint** |                                                                             |                                    |
| **Méthode** |                                                                             |                                    |
| **Description** |                                                                             |                                    |
| **Authentification** |                                                                             |                                    |
| **Paramètres de Requête** |                                                                             |                                    |
| - Nom                      |                                                                             |                                    |
| - Type                     |                                                                             |                                    |
| - Obligatoire              |                                                                             |                                    |
| - Description              |                                                                             |                                    |
| - Exemple                  |                                                                             |                                    |
| **Exemple de Requête** |                                                                             |                                    |
| **Réponse** |                                                                             |                                    |
| - Code de Statut           |                                                                             |                                    |
| - Corps                    |                                                                             |                                    |
| - Description des Champs   |                                                                             |                                    |
| **Réponses d'Erreur** |                                                                             |                                    |
| - Code de Statut           |                                                                             |                                    |
| - Corps                    |                                                                             |                                    |
| **Remarques** |                                                                             |                                    |

### Server Pong

This document describes the API endpoints for the `server_pong` Django application, which facilitates real-time multiplayer Pong game simulations. The API provides functionalities for managing game sessions, retrieving simulation states, and handling real-time communication.

---

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
