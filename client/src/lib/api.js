const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function handleResponse(response) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Request failed.");
  }

  return response.json();
}

export async function createRoom() {
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response);
}

export async function getRoom(roomId) {
  const response = await fetch(`${API_BASE_URL}/rooms/${encodeURIComponent(roomId)}`);
  return handleResponse(response);
}

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
