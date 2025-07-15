
import requests
import sys

uriJwt = "https://access_postgresql:4000/"

def decodeJWT(request, encodedJwt=None) :
    if not encodedJwt :
        #print(f"headers : {request.headers}", file=sys.stderr)
        # encodedJwt = request.COOKIES.get("access", None)
        encodedJwt = request.headers.get("Authorization", None)
        #print(f"encodedJWT : {encodedJwt}", file=sys.stderr)
    if not encodedJwt :
        return [None]
    
    # res = requests.get(f'{uriJwt}api/DecodeJwt', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'access_postgresql'}, verify=False)
    res = requests.get(f'{uriJwt}api/DecodeJwt/', headers={"Authorization" : f"{encodedJwt}", 'Host': 'localhost'}, verify=False)
    if res.status_code != 200 :
        # print(f"Not recognized, code = {res.status_code} Body : {res.text}", file=sys.stderr)
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
	# with open("log-auth-cookie.txt", "w+") as f :
	# 	# print(f"body : {response}\naccess : {access}\nrefresh : {refresh}", file=f)
	return response