# Makefile à la racine du projet Django

PYTHON = python3
PIP = pip
ENV = env

run:
	$(PYTHON) manage.py runserver

migrate:
	$(PYTHON) manage.py makemigrations
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
