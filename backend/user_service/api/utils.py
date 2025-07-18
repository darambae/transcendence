
import requests
import sys

uriJwt = "https://access_postgresql:4000/"

def decodeJWT(request, encodedJwt=None) :
    if not encodedJwt :
        encodedJwt = request.headers.get("Authorization", None)
    if not encodedJwt :
        return [None]
    
    res = requests.get(f'{uriJwt}api/DecodeJwt/', headers={"Authorization" : f"{encodedJwt}", 'Host': 'localhost'}, verify=False)
    if res.status_code != 200 :
        return [None]
    return [res.json()]

def setTheCookie(response, access=None, refresh=None) :
	if access :
		response.set_cookie(
			key="access_token",
			value=access,
			httponly=True,
			samesite='Lax'
		)
	if refresh :
		response.set_cookie(
			key="refresh_token",
			value=refresh,
			httponly=True,
			samesite='Lax'
		)
	return response