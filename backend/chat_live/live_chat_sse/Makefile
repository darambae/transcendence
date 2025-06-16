# Makefile à la racine du projet Django

PYTHON = python3
PIP = pip
ENV = env

run:
	PYTHONPATH=. daphne live_chat_sse.asgi:application

delete:
	rm db.sqlite3
	rm chatMessage/migrations/0*.py
	
migrate:
#crée le code python qui décrit comment créer la table en SQL
	$(PYTHON) manage.py makemigrations
#execute le code et crée la table message dans db.sqlite3
	$(PYTHON) manage.py migrate

createsuperuser:
	$(PYTHON) manage.py createsuperuser

shell:
	$(PYTHON) manage.py shell

freeze:
	$(PIP) freeze > requirements.txt

install:
	$(PIP) install -r requirements.txt

test:
	$(PYTHON) manage.py test

activate:
	@echo "Run 'source $(ENV)/bin/activate' manually"

quit:
	@echo "Pour quitter l'environnement virtuel, tapez 'deactivate' dans votre shell."
