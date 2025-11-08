import { authService } from "../../utils/auth.js";

const API_BASE = "https://story-api.dicoding.dev/v1";

function getAuthToken() {
  return authService.getToken();
}

export async function fetchStoriesWithToken() {
  const token = getAuthToken();

  if (!token) {
    console.log("User belum login, tidak bisa mengambil data stories");
    return [];
  }

  try {
    const response = await fetch(`${API_BASE}/stories`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    if (json.error || !json.listStory) {
      console.error("API returned error:", json.message);
      return [];
    }

    return json.listStory;
  } catch (error) {
    console.error("Error fetching stories:", error);
    return [];
  }
}

export async function postStory(data) {
  const token = getAuthToken();

  if (!token) {
    return {
      error: true,
      message: "Anda harus login untuk menambah cerita.",
    };
  }

  const formData = new FormData();
  formData.append("description", data.description);
  formData.append("photo", data.photo);
  if (data.lat) formData.append("lat", data.lat);
  if (data.lon) formData.append("lon", data.lon);

  try {
    const response = await fetch(`${API_BASE}/stories`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await response.json();

    if (!response.ok || json.error) {
      return {
        error: true,
        message: json.message || `Status ${response.status}`,
      };
    }

    return json;
  } catch (error) {
    return {
      error: true,
      message: "Gagal mengirim data karena masalah jaringan.",
    };
  }
}

export async function loginUser({ email, password }) {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: true,
        message: data.message || "Login gagal",
      };
    }

    return {
      error: false,
      data: data,
    };
  } catch (error) {
    return {
      error: true,
      message: "Terjadi kesalahan jaringan",
    };
  }
}

export async function registerUser({ name, email, password }) {
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: true,
        message: data.message || "Pendaftaran gagal",
      };
    }

    return {
      error: false,
      data: data,
    };
  } catch (error) {
    return {
      error: true,
      message: "Terjadi kesalahan jaringan",
    };
  }
}
