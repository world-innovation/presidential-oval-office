from datetime import datetime

from app.services.routing import (
    altitude_for_bearing,
    bearing_degrees,
    estimate_flight_duration_sec,
    generate_waypoints,
    haversine_distance_m,
)


def test_haversine_known_distance():
    d = haversine_distance_m(35.6812, 139.7671, 35.6580, 139.7016)
    assert 5_000 < d < 10_000


def test_bearing_north():
    b = bearing_degrees(35.0, 139.0, 36.0, 139.0)
    assert 355 < b or b < 5


def test_bearing_east():
    b = bearing_degrees(35.0, 139.0, 35.0, 140.0)
    assert 85 < b < 95


def test_altitude_layers_differ():
    alts = {altitude_for_bearing(b) for b in [0, 90, 180, 270]}
    assert len(alts) == 4


def test_generate_waypoints_has_endpoints():
    dep = datetime(2025, 1, 1, 12, 0, 0)
    wps = generate_waypoints(35.68, 139.77, 35.66, 139.70, 100.0, dep)
    assert len(wps) >= 3
    assert wps[0]["latitude"] == 35.68
    assert wps[-1]["latitude"] == 35.66


def test_estimate_flight_duration():
    dur = estimate_flight_duration_sec(35.6812, 139.7671, 35.6580, 139.7016)
    assert dur > 0
