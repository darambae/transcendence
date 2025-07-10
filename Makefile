#### MAIN = transcendence without ELK stack ####
MAIN=transcendence
ELK=elk

DOCKER_FILE=docker-compose.yml

MAIN_CONTAINERS=user_service ai_pong server_pong nginx_modsecurity postgres redis game_redis auth mail access_postgresql live_chat tournament
ELK_CONTAINERS=elasticsearch kibana logstash

# POUR GAUTIER & OMAR
USER_CONTAINER=nginx_modsecurity postgres access_postgresql auth user_service mail live_chat

# POUR RAFAEL
GAME_CONTAINER=ai_pong server_pong game_redis nginx_modsecurity postgres user_service access_postgresql auth mail tournament live_chat

# POUR KELLY PLUS TARD
CHAT_CONTAINER=live_chat nginx_modsecurity postgres redis access_postgresql server_pong ai_pong user_service tournament

COMPOSE=docker compose -f ${DOCKER_FILE}

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

# Run only the 'certs_generator' contianer to generate the CA certificates
certs_generator: #add-ca
	@echo "Building certs_generator container..."
	@${COMPOSE} build certs_generator
	@echo "Generating CA..."
	@${COMPOSE} run --rm certs_generator
	@echo "CA generated successfully." 

# Build the ELK stack
build-user: certs_generator
	@echo "Building user service..."
	@${COMPOSE} build ${USER_CONTAINER}

build-chat: certs_generator
	@echo "Building live chat service..."
	@${COMPOSE} build ${CHAT_CONTAINER}

build-game: certs_generator
	@echo "Building game service..."
	@${COMPOSE} build ${GAME_CONTAINER}

build-elk: certs_generator
	@echo "Building ELK stack..."
	@${COMPOSE} build ${ELK_CONTAINERS}

build-main: certs_generator
	@echo "Building Django services..."
	@${COMPOSE} build ${MAIN_CONTAINERS}

build: certs_generator
	@echo "Building Transcendence..."
	@${COMPOSE} build ${MAIN_CONTAINERS} ${ELK_CONTAINERS}

no-cache:
	@echo "Building ELK stack..."
	@${COMPOSE} build --no-cache
	@echo "Building Transcendence..."
	@${COMPOSE} build --no-cache
	@echo "Transcendence built successfully."

up-user:
	@echo "Building & starting user service..."
	@${COMPOSE} up ${USER_CONTAINER}

up-chat:
	@echo "Building & starting live chat service..."
	@${COMPOSE} up ${CHAT_CONTAINER}

up-game:
	@echo "Building & starting game service..."
	@${COMPOSE} up ${GAME_CONTAINER}

up-elk:
	@echo "Building & starting ELK stack..."
	@${COMPOSE} up ${ELK_CONTAINERS} 

up-main:
	@echo "Building & starting Transcendence..."
	@${COMPOSE} up ${MAIN_CONTAINERS}

up:
	@echo "Starting Transcendence with ELK stack..."
	@${COMPOSE} up ${MAIN_CONTAINERS} ${ELK_CONTAINERS}

start-user:
	@echo "Starting user service..."
	@${COMPOSE} start ${USER_CONTAINER}
start-chat:
	@echo "Starting live chat service..."
	@${COMPOSE} start ${CHAT_CONTAINER}

start-game:
	@echo "Starting game service..."
	@${COMPOSE} start ${GAME_CONTAINER}

start-elk:
	@echo "Starting ELK stack..."
	@${COMPOSE} start ${ELK_CONTAINERS}

start-main:
	@echo "Starting Transcendence..."
	@${COMPOSE} start ${MAIN_CONTAINERS}

start:
	@make start-elk & make start-main

down:
	@echo "Stopping Transcendence..."
	@# Safety check: ensure we're in the correct directory
	@if [ ! -f "docker-compose.yml" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then \
		echo "ERROR: This command must be run from the transcendence project root directory!"; \
		echo "Expected files/directories: docker-compose.yml, backend/, frontend/"; \
		echo "Current directory: $$(pwd)"; \
		exit 1; \
	fi
	@${COMPOSE} down -v
	@echo "Transcendence stopped."
	@echo "Deleting migrations & creating new migrations directory..."
	@if [ -d "./backend/access_postgresql/api/migrations" ]; then rm -rf ./backend/access_postgresql/api/migrations; fi
	@if [ -d "./backend/user_service/api/migrations" ]; then rm -rf ./backend/user_service/api/migrations; fi
	@mkdir -p ./backend/access_postgresql/api/migrations
	@mkdir -p ./backend/user_service/api/migrations
	@touch ./backend/access_postgresql/api/migrations/__init__.py
	@touch ./backend/user_service/api/migrations/__init__.py
	@echo "Migrations directories recreated."
	@echo "Deleting uploaded images except default.png..."
	@if [ -d "./backend/user_service/api/media/imgs" ]; then \
		find ./backend/user_service/api/media/imgs/ -type f -not -name "default.png" -delete; \
	fi
	@echo "Uploaded images deleted."
	@echo "Deleting pycache directories..."
	@if [ -d "./backend" ]; then \
		find ./backend -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true; \
	fi
	@echo "Pycache directories deleted."
	@echo "Deleting server_pong log files..."
	@if [ -d "./backend/server_pong" ]; then \
		rm -f ./backend/server_pong/*_decodeJWT.txt ./backend/server_pong/test.txt; \
	fi
	@echo "Server pong log files deleted."

destroy:
	@echo "Destroying Transcendence..."
	@${COMPOSE} down -v --rmi all --remove-orphans

prune:
	@echo "Pruning unused Docker resources..."
	@docker system prune --all --force

.PHONY: \
	add-ca \
	certs_generator \
	build-user \
	build-chat \
	build-game \
	build-elk \
	build-main \
	build \
	no-cache \
	up-user \
	up-chat \
	up-game \
	up-elk \
	up-main \
	up \
	start-user \
	start-chat \
	start-game \
	start-elk \
	start-main \
	start \
	down \
	destroy \
	prune