import urllib.request
import json
import os

screens = {
    "dashboard": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1OTExNTE3NDlhY2EwN2M0ZTJkMzgzMzYwMGI1EgsSBxDpvLHarwUYAZIBIwoKcHJvamVjdF9pZBIVQhMyMjAwNjMxMzgxNjY4NDU2NzEx&filename=&opi=89354086",
    "domain_mastery": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1OGVjZmI0NzlmYjgwNTIyYTJiMThmMjIxZTA2EgsSBxDpvLHarwUYAZIBIwoKcHJvamVjdF9pZBIVQhMyMjAwNjMxMzgxNjY4NDU2NzEx&filename=&opi=89354086",
    "profile_settings": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1OGVkMjMwZjUxYjEwMzgzOGJkYTg5M2I3Y2Q5EgsSBxDpvLHarwUYAZIBIwoKcHJvamVjdF9pZBIVQhMyMjAwNjMxMzgxNjY4NDU2NzEx&filename=&opi=89354086",
    "analytics": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1OGVkMGFhMjhhMWMwOTI1YzdiOWFmMjRkYWM0EgsSBxDpvLHarwUYAZIBIwoKcHJvamVjdF9pZBIVQhMyMjAwNjMxMzgxNjY4NDU2NzEx&filename=&opi=89354086"
}

os.makedirs("stitch_screens", exist_ok=True)

for name, url in screens.items():
    print(f"Downloading {name}...")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            with open(f"stitch_screens/{name}.html", "w", encoding="utf-8") as f:
                f.write(html)
            print(f"Saved stitch_screens/{name}.html")
    except Exception as e:
        print(f"Failed to download {name}: {e}")
