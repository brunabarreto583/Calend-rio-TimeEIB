import json

with open("json/credentials.json", "r", encoding="utf-8") as f:
    data = json.load(f)

credentials_str = json.dumps(data, separators=(",", ":"))

print(f'CREDENTIALS={credentials_str}')
