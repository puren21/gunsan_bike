"""Build topology-checked static display copies; originals remain read-only.
Requires Shapely 2.0.7: python3 -m pip install shapely==2.0.7
Seven decimal places keep tiny islands intact (<0.008 m rounding displacement
at Gunsan). A shared coordinate always maps to the same output coordinate.
No vertices, features, properties or polygon parts are removed or repaired.
Invalid input/output aborts before writing any display files.
"""
import hashlib
import json
import re
from pathlib import Path
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parent.parent
FILES = [('City Boundary.geojson', 'city-v1.geojson'), ('Township Boundary.geojson', 'township-v1.geojson')]


def rounded(value):
    return [rounded(x) for x in value] if isinstance(value, list) else round(value, 7) if isinstance(value, (float, int)) else value


def build():
    outputs = []
    for source, target in FILES:
        original = (ROOT / source).read_bytes()
        data = json.loads(original)
        for feature in data['features']:
            if not shape(feature['geometry']).is_valid:
                raise ValueError(source + ': invalid source; original must not be silently repaired.')
            feature['geometry']['coordinates'] = rounded(feature['geometry']['coordinates'])
            if not shape(feature['geometry']).is_valid:
                raise ValueError(source + ': rounding would invalidate a boundary; no outputs written.')
        output = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
        outputs.append((source, target, original, output))
    html = (ROOT / 'index.html').read_text()
    for source, target, original, output in outputs:
        digest = hashlib.sha256(output).hexdigest()
        url = 'data/display/' + target
        html = re.sub(re.escape(url) + r'\?v=[a-f0-9]+', url + '?v=' + digest[:12], html)
        (ROOT / 'data/display' / target).write_bytes(output)
        print(f'{source}: {len(original):,} -> {len(output):,} bytes ({100*(1-len(output)/len(original)):.1f}% smaller); SHA256 {digest}')
    (ROOT / 'index.html').write_text(html)
    print('All original/display features valid; shared coordinate rounding deterministic.')


if __name__ == '__main__':
    build()
