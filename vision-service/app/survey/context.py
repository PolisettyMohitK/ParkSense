"""Map context around the plot: roads, buildings and access points.

Uses the Overpass API (OpenStreetMap, ODbL) with a short timeout and an on-disk
cache. When offline the pipeline continues without context and records why.
Google Open Buildings and Copernicus DEM are stubbed behind the same interface
so they can be plugged in without touching the pipeline.
"""

from __future__ import annotations

import json
import math
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
CACHE_DIR = Path(__file__).resolve().parent.parent.parent / ".cache" / "context"
TIMEOUT_S = 8.0
CACHE_TTL_S = 7 * 24 * 3600


@dataclass
class MapContext:
    available: bool
    source: str = "openstreetmap/overpass"
    buildings: list[dict] = field(default_factory=list)
    roads: list[dict] = field(default_factory=list)
    access_points: list[dict] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def _cache_path(latitude: float, longitude: float, radius_m: int) -> Path:
    key = f"{latitude:.5f}_{longitude:.5f}_{radius_m}"
    return CACHE_DIR / f"{key}.json"


def _load_cache(path: Path) -> dict | None:
    if not path.exists():
        return None
    if time.time() - path.stat().st_mtime > CACHE_TTL_S:
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _overpass_query(latitude: float, longitude: float, radius_m: int) -> dict:
    query = f"""
    [out:json][timeout:6];
    (
      way(around:{radius_m},{latitude},{longitude})["highway"];
      way(around:{radius_m},{latitude},{longitude})["building"];
      node(around:{radius_m},{latitude},{longitude})["barrier"="gate"];
      node(around:{radius_m},{latitude},{longitude})["entrance"];
    );
    out center 200;
    """
    data = urllib.parse.urlencode({"data": query}).encode()
    request = urllib.request.Request(
        OVERPASS_URL, data=data, headers={"User-Agent": "ParkSense-Survey/2.0"})
    with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_context(latitude: float | None, longitude: float | None, radius_m: int = 150) -> MapContext:
    if latitude is None or longitude is None:
        return MapContext(available=False, notes=["No GPS fix; map context skipped"])

    cache_file = _cache_path(latitude, longitude, radius_m)
    cached = _load_cache(cache_file)

    if cached is None:
        try:
            cached = _overpass_query(latitude, longitude, radius_m)
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            cache_file.write_text(json.dumps(cached), encoding="utf-8")
        except Exception as error:  # noqa: BLE001 - offline must not break the pipeline
            return MapContext(
                available=False,
                notes=[f"Overpass unavailable ({type(error).__name__}); context skipped"],
            )

    context = MapContext(available=True)
    metres_per_deg_lat = 111_320.0
    metres_per_deg_lon = 111_320.0 * max(0.01, math.cos(math.radians(latitude)))

    def to_local(node_lat: float, node_lon: float) -> dict:
        return {
            "x": (node_lon - longitude) * metres_per_deg_lon,
            "y": (node_lat - latitude) * metres_per_deg_lat,
        }

    for element in cached.get("elements", []):
        tags = element.get("tags", {})
        centre = element.get("center") or {}
        lat = element.get("lat", centre.get("lat"))
        lon = element.get("lon", centre.get("lon"))
        if lat is None or lon is None:
            continue
        entry = {"id": element.get("id"), "tags": tags, **to_local(lat, lon)}
        if "building" in tags:
            context.buildings.append(entry)
        if "highway" in tags:
            context.roads.append(entry)
        if tags.get("barrier") == "gate" or "entrance" in tags:
            context.access_points.append(entry)

    if not context.access_points and context.roads:
        # Fall back to the nearest road vertex as an entry candidate.
        nearest = min(context.roads, key=lambda item: item["x"] ** 2 + item["y"] ** 2)
        context.access_points.append({**nearest, "tags": {**nearest["tags"], "inferred": "true"}})

    return context
