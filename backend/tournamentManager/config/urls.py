"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path
from api.views import tournamentManager, sse, joinGuest, launchMatch, checkSSE, getIds, Supervise, amIinTournament, launchFinals, getResults, launchNextMatch, clearGuests

urlpatterns = [
    path("tournament/tournament", tournamentManager, name="tournamentManager"),
    path("tournament/guest", joinGuest, name="joinGuest"),
    path("tournament/events", sse, name="sse"),
    path("tournament/match", launchMatch, name="launchMatch"),
    path("tournament/finals", launchFinals, name="launchFinals"),
    path("tournament/check-sse", checkSSE, name="checkSSE"),
    path("tournament/id-players", getIds, name="getIds"),
    path("tournament/supervise", Supervise, name="Supervise"),
    path("tournament/me", amIinTournament, name="amIinTournament"),
    path("tournament/next", launchNextMatch, name="launchNextMatch"),
	path("tournament/<str:tkey>/results/", getResults, name="getResults"),
	path("tournament/guests", clearGuests, name="clearGuests")
]
