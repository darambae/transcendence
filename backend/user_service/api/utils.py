
import requests
import sys

uriJwt = "https://access-postgresql:4000/"

def decodeJWT(request, encodedJwt=None) :
    if not encodedJwt :
        #print(f"headers : {request.headers}", file=sys.stderr)
        # encodedJwt = request.COOKIES.get("access", None)
        encodedJwt = request.headers.get("Authorization", None)
        #print(f"encodedJWT : {encodedJwt}", file=sys.stderr)
    if not encodedJwt :
        return [None]
    
    # res = requests.get(f'{uriJwt}api/DecodeJwt', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'access-postgresql'}, verify=False)
    res = requests.get(f'{uriJwt}api/DecodeJwt', headers={"Authorization" : f"{encodedJwt}", 'Host': 'access-postgresql'}, verify=False)
    if res.status_code != 200 :
        print(f"Not recognized, code = {res.status_code} Body : {res.text}", file=sys.stderr)
        return [None]
    return [res.json()]