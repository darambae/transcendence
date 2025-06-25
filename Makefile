#### MAIN = transcendence without ELK stack ####
MAIN=transcendence
ELK=elk

DOCKER_FILE=docker-compose.yml

MAIN_CONTAINERS=user_service ai_pong server_pong nginx_modsecurity postgres redis game_redis auth mail access_postgresql live_chat tournament	
ELK_CONTAINERS=elasticsearch kibana logstash

# POUR GAUTIER & OMAR
USER_CONTAINER=nginx_modsecurity postgres access_postgresql auth user_service mail

# POUR RAFAEL
GAME_CONTAINER=ai_pong server_pong game_redis nginx_modsecurity postgres user_service access_postgresql auth mail tournament

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
	@${COMPOSE} down -v
	@echo "Transcendence stopped."
	@echo "Deleting migrations & creating new migrations directory..."
	@rm -rf ./backend/access_postgresql/api/migrations ./backend/user_service/api/migrations
	@mkdir -p ./backend/access_postgresql/api/migrations
	@mkdir -p ./backend/user_service/api/migrations
	@cat << EOF > ./backend/access_postgresql/api/migrations/__init__.py
	@cat << EOF > ./backend/user_service/api/migrations/__init__.py
	@echo "Migrations directories recreated."
	@echo "Deleting pycache directories..."
	@find ./backend -type d -name "__pycache__" -exec rm -rf {} +
	@echo "Pycache directories deleted."

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