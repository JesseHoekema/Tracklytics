import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# !!! FILL THIS IN !!!
SPOTIFY_ACCESS_TOKEN = "BQDLOKLAgyxbJ6eprZkZj9Wuc4n7b1z8rzGNDRsln1yNkLF9qIqEwoqjZZVanMWAn9C_inW6WxJmjnnDj6ewKRfghjvHYuAvfNZ3IRxXCAAQEcup3oEqpAGfqKSQfzkT8-WP6oPYM_o"

HEADERS = {
    "Authorization": f"Bearer {SPOTIFY_ACCESS_TOKEN}",
}

# Example list of (artist, title) pairs – real, popular songs.
songs = [
    ("Taylor Swift", "Blank Space"),
    ("The Weeknd", "Blinding Lights"),
    ("Adele", "Hello"),
    ("Drake", "Hotline Bling"),
    ("Ed Sheeran", "Shape of You"),
    ("Billie Eilish", "bad guy"),
    ("Dua Lipa", "Levitating"),
    ("Harry Styles", "Watermelon Sugar"),
    ("Shawn Mendes", "Stitches"),
    ("Bruno Mars", "Uptown Funk"),
    ("Post Malone", "Circles"),
    ("Lady Gaga", "Shallow"),
    ("Imagine Dragons", "Believer"),
    ("Luis Fonsi", "Despacito"),
    ("Kendrick Lamar", "HUMBLE."),
    ("Coldplay", "Viva La Vida"),
    ("Sia", "Chandelier"),
    ("Lil Nas X", "Old Town Road"),
    ("Mark Ronson", "Uptown Funk"),
    ("Maroon 5", "Memories"),
    ("Katy Perry", "Roar"),
    ("Sam Smith", "Stay With Me"),
    ("Ariana Grande", "7 rings"),
    ("Lizzo", "Truth Hurts"),
    ("Camila Cabello", "Havana"),
    ("Selena Gomez", "Bad Liar"),
    ("Justin Bieber", "Sorry"),
    ("Miley Cyrus", "Flowers"),
    ("Travis Scott", "SICKO MODE"),
    ("Tones and I", "Dance Monkey"),
    ("Major Lazer", "Lean On"),
    ("BTS", "Dynamite"),
    ("Halsey", "Without Me"),
    ("Rihanna", "Diamonds"),
    ("Chainsmokers", "Closer"),
    ("Cardi B", "I Like It"),
    ("Ellie Goulding", "Love Me Like You Do"),
    ("Doja Cat", "Say So"),
    ("Calvin Harris", "Summer"),
    ("OneRepublic", "Counting Stars"),
    ("Macklemore", "Can't Hold Us"),
    ("Shakira", "Waka Waka"),
    ("David Guetta", "Titanium"),
    ("Avicii", "Wake Me Up"),
    ("Eminem", "Lose Yourself"),
    ("George Ezra", "Shotgun"),
    ("Pharrell Williams", "Happy"),
    ("Queen", "Bohemian Rhapsody"),
    ("Journey", "Don't Stop Believin'"),
    ("John Legend", "All of Me"),
    # Add 50 more for 100 songs in total.
]
# For brevity, we'll shuffle & just repeat the list to get 100 for demo.
while len(songs) < 100:
    songs += songs[:100-len(songs)]

def normalize(text):
    return text.lower().strip()

def search_track_id(artist, title):
    q = f'artist:{artist} track:{title}'
    params = {
        'q': q,
        'type': 'track',
        'limit': 1
    }
    resp = requests.get('https://api.spotify.com/v1/search', headers=HEADERS, params=params)
    resp.raise_for_status()
    results = resp.json()
    items = results.get('tracks', {}).get('items', [])
    if items:
        return items[0]['id']
    else:
        return None

def batch_fetch_tracks(track_ids):
    ids_param = ','.join(track_ids)
    resp = requests.get('https://api.spotify.com/v1/tracks', headers=HEADERS, params={'ids': ids_param})
    resp.raise_for_status()
    return resp.json()['tracks']

def parallel_batch_fetch(all_ids):
    batches = [all_ids[i:i+50] for i in range(0, len(all_ids), 50)]
    results = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(batch_fetch_tracks, batch) for batch in batches]
        for future in as_completed(futures):
            results.extend(future.result())
    return results

def main():
    print("Resolving Spotify Track IDs...")
    id_cache = {}
    for artist, title in songs:
        key = (normalize(artist), normalize(title))
        if key not in id_cache:
            id = search_track_id(artist, title)
            if id:
                id_cache[key] = id
            else:
                print(f"Not found: {artist} - {title}")
    all_ids = list(id_cache.values())
    print(f"Resolved {len(all_ids)} tracks. Fetching durations...")

    tracks = parallel_batch_fetch(all_ids)

    # Map id to (artist, title) for pretty printing
    reverse_lookup = {v: k for k, v in id_cache.items()}
    results = []
    for track in tracks:
        if not track: continue
        artist, title = reverse_lookup.get(track['id'], ("", ""))
        duration_ms = track['duration_ms']
        duration_sec = duration_ms / 1000.0
        results.append((artist, title, duration_sec, track['name']))
        print(f"{artist} - {title}: {duration_sec:.2f} sec ({track['name']})")

    print(f"Fetched durations for {len(results)} tracks.")

if __name__ == "__main__":
    main()