"""Parking layout profiles (bay geometry and limits per vehicle type)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ParkingProfile:
    key: str
    label: str
    bay_width_m: float
    bay_length_m: float
    aisle_width_m: float
    angles_deg: tuple[int, ...]
    max_slope_pct: float
    max_roughness_m: float


PROFILES: dict[str, ParkingProfile] = {
    "CAR": ParkingProfile(
        key="CAR", label="Car", bay_width_m=2.5, bay_length_m=5.0,
        aisle_width_m=6.0, angles_deg=(90, 60, 45, 0), max_slope_pct=5.0, max_roughness_m=0.06,
    ),
    "BIKE": ParkingProfile(
        key="BIKE", label="Two-wheeler", bay_width_m=1.0, bay_length_m=2.0,
        aisle_width_m=2.5, angles_deg=(90,), max_slope_pct=8.0, max_roughness_m=0.08,
    ),
    "MIXED": ParkingProfile(
        key="MIXED", label="Mixed (cars + bikes)", bay_width_m=2.5, bay_length_m=5.0,
        aisle_width_m=6.0, angles_deg=(90, 60, 45), max_slope_pct=6.0, max_roughness_m=0.07,
    ),
    "BUS": ParkingProfile(
        key="BUS", label="Bus / truck", bay_width_m=3.5, bay_length_m=12.0,
        aisle_width_m=9.0, angles_deg=(90, 0), max_slope_pct=4.0, max_roughness_m=0.05,
    ),
}


def get_profile(key: str | None) -> ParkingProfile:
    if not key:
        return PROFILES["CAR"]
    return PROFILES.get(key.upper(), PROFILES["CAR"])


def list_profiles() -> list[dict]:
    return [
        {
            "key": profile.key,
            "label": profile.label,
            "bay_width_m": profile.bay_width_m,
            "bay_length_m": profile.bay_length_m,
            "aisle_width_m": profile.aisle_width_m,
            "angles_deg": list(profile.angles_deg),
            "max_slope_pct": profile.max_slope_pct,
            "max_roughness_m": profile.max_roughness_m,
        }
        for profile in PROFILES.values()
    ]
