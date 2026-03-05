const BASE = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  getPorts: () => request<import("../types").Port[]>("/api/ports"),
  getDrones: () => request<import("../types").Drone[]>("/api/drones"),
  getDeliveries: () => request<import("../types").Delivery[]>("/api/deliveries"),
  getStats: () => request<import("../types").SystemStats>("/api/simulation/stats"),

  createDelivery: (body: {
    user_id: string;
    pickup_port_id: number;
    delivery_port_id: number;
    payload_weight_kg: number;
  }) =>
    request<import("../types").Delivery>("/api/deliveries", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  seed: () => request<{ message: string }>("/api/simulation/seed", { method: "POST" }),

  tick: () =>
    request<import("../types").SimulationTick>("/api/simulation/tick", { method: "POST" }),

  getUserDeliveries: (userId: string) =>
    request<import("../types").DeliveryDetail[]>(`/api/deliveries/user/${encodeURIComponent(userId)}`),

  getDeliveryDetail: (id: number) =>
    request<import("../types").DeliveryDetail>(`/api/deliveries/${id}/detail`),
};
