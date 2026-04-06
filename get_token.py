import requests
import base64

CLIENT_ID = 'afb3405ea857489fad9c18f437715eaa'
CLIENT_SECRET = '07c11f4db76c4bb180d1417fe31217ab'

credentials = f"{CLIENT_ID}:{CLIENT_SECRET}"
b64_credentials = base64.b64encode(credentials.encode()).decode()

resp = requests.post(
    'https://accounts.spotify.com/api/token',
    headers={"Authorization": f"Basic {b64_credentials}"},
    data={"grant_type": "client_credentials"}
)

print(resp.json())