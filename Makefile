NAME=transcendence
PREP_NAME=elk

MAIN_DOCKER_FILE=docker-compose.yml
PREP_DOCKER_FILE=elk-docker-compose.yml

PRE_COMPOSE=docker compose -f ${PREP_DOCKER_FILE} -p ${PREP_NAME}
COMPOSE=docker compose -f ${MAIN_DOCKER_FILE} -p ${NAME}

# Build the ELK stack
build-elk:
	@echo "Building ELK stack..."
	@${PRE_COMPOSE} build

build-main:
	@echo "Building Transcendence..."
	@${COMPOSE} build

build:
	@make build-elk
	@make build-main

no-cache:
	@echo "Building ELK stack..."
	@${PRE_COMPOSE} build --no-cache
	@echo "Building Transcendence..."
	@${COMPOSE} build --no-cache
	@echo "Transcendence built successfully."

up-elk:
	@echo "Building ELK stack..."
	@${PRE_COMPOSE} up

up-main:
	@echo "Building Transcendence..."
	@${COMPOSE} up

up:
	@echo "Starting ELK stack..."
	@make up-elk & make up-main 

down-elk:
	@echo "Stopping ELK stack..."
	@${PRE_COMPOSE} down -v
	@echo "ELK stack stopped."

down-main:
	@echo "Stopping Transcendence..."
	@${COMPOSE} down -v
	@echo "Transcendence stopped."

down:
	@make down-main
	@make down-elk

destroy:
	@echo "Destroying ELK stack..."
	@${PRE_COMPOSE} down -v --rmi all --remove-orphans
	@echo "ELK stack destroyed."
	@echo "Destroying Transcendence..."
	@${COMPOSE} down -v --rmi all --remove-orphans

.PHONY: no-cache up-elk up-main up down-elk down-main down destroy