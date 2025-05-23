NAME=transcendence
PREP_NAME=elk

MAIN_DOCKER_FILE=docker-compose.yml
PREP_DOCKER_FILE=elk-docker-compose.yml

PRE_COMPOSE=docker compose -f ${PREP_DOCKER_FILE} -p ${PREP_NAME}
COMPOSE=docker compose -f ${MAIN_DOCKER_FILE} -p ${NAME}

CA=./elk/setup/certs/ca/
CA=./elk/setup/certs/ca/
CA_CRT=$(CA)ca.crt
CA_KEY=$(CA)ca.key

# Add CA to the system
add-ca:
	@sudo true
	@echo "Adding CA certificate to system trust store..."
	@if [ "$$(uname)" = "Darwin" ]; then \
		sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${CA_CRT}; \
		echo "CA added to macOS System keychain."; \
	elif [ "$$(uname)" = "Linux" ]; then \
		sudo cp ${CA_CRT} /usr/local/share/ca-certificates/ca.crt; \
		sudo update-ca-certificates; \
		echo "CA added to Linux trust store."; \
	else \
		echo "Automatic CA installation not supported for this OS."; \
	fi

# Run only the 'setup' contianer to generate the CA
setup: add-ca
	@echo "Building setup container..."
	@${PRE_COMPOSE} build setup
	@echo "Generating CA..."
	@${PRE_COMPOSE} run --rm setup
	@echo "CA generated successfully." 

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
	@echo "Building & starting ELK stack..."
	@${PRE_COMPOSE} up

up-main:
	@echo "Building & starting Transcendence..."
	@${COMPOSE} up

up: #add-ca
	@echo "Building and starting ELK stack..."
	@make up-elk & make up-main 

start-elk:
	@echo "Starting ELK stack..."
	@${PRE_COMPOSE} start

start-main:
	@echo "Starting Transcendence..."
	@${COMPOSE} start

start:
	@echo "Starting ELK stack..."
	@make start-elk & make start-main

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