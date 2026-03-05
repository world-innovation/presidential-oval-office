def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_create_and_list_ports(client):
    resp = client.post("/api/ports", json={
        "name": "Test Port",
        "latitude": 35.68,
        "longitude": 139.77,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Port"

    resp = client.get("/api/ports")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_create_drone(client):
    client.post("/api/ports", json={"name": "P1", "latitude": 35.68, "longitude": 139.77})
    resp = client.post("/api/drones", json={"name": "Drone-1", "home_port_id": 1})
    assert resp.status_code == 201
    assert resp.json()["name"] == "Drone-1"
    assert resp.json()["current_lat"] == 35.68


def test_create_delivery_assigns_drone(client):
    client.post("/api/ports", json={"name": "Pickup", "latitude": 35.6812, "longitude": 139.7671})
    client.post("/api/ports", json={"name": "Delivery", "latitude": 35.6580, "longitude": 139.7016})
    client.post("/api/drones", json={"name": "D1", "home_port_id": 1})

    resp = client.post("/api/deliveries", json={
        "user_id": "user-1",
        "pickup_port_id": 1,
        "delivery_port_id": 2,
        "payload_weight_kg": 2.0,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "assigned"


def test_seed_data(client):
    resp = client.post("/api/simulation/seed")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ports"] == 8
    assert data["drones"] == 16


def test_simulation_tick(client):
    client.post("/api/simulation/seed")
    client.post("/api/deliveries", json={
        "user_id": "user-1",
        "pickup_port_id": 1,
        "delivery_port_id": 2,
        "payload_weight_kg": 1.0,
    })
    resp = client.post("/api/simulation/tick")
    assert resp.status_code == 200
    data = resp.json()
    assert "tick" in data
    assert "active_flights" in data


def test_delivery_same_port_rejected(client):
    client.post("/api/ports", json={"name": "P1", "latitude": 35.68, "longitude": 139.77})
    resp = client.post("/api/deliveries", json={
        "user_id": "u1",
        "pickup_port_id": 1,
        "delivery_port_id": 1,
        "payload_weight_kg": 1.0,
    })
    assert resp.status_code == 400


def test_system_stats(client):
    client.post("/api/simulation/seed")
    resp = client.get("/api/simulation/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_ports"] == 8
    assert data["total_drones"] == 16
