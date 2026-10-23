"""Build static display copies; originals and feature attributes remain unchanged.
Round coordinates to 5 decimal places (<0.8 m positional error at Gunsan).
No vertex removal: shared edges retain identical coordinates; originals remain authoritative.
"""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent

def rounded(value):
    return [rounded(x) for x in value] if isinstance(value, list) else round(value, 5) if isinstance(value, (float, int)) else value

for source, target in [('City Boundary.geojson', 'city-v1.geojson'), ('Township Boundary.geojson', 'township-v1.geojson')]:
    original = (root / source).read_bytes()
    data = json.loads(original)
    for feature in data['features']:
        feature['geometry']['coordinates'] = rounded(feature['geometry']['coordinates'])
    output = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
    (root / 'data/display' / target).write_bytes(output)
    print(f'{source}: {len(original):,} -> {len(output):,} bytes ({100*(1-len(output)/len(original)):.1f}% smaller); SHA256 {hashlib.sha256(output).hexdigest()}')
