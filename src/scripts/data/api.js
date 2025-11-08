import { authService } from "../utils/auth.js";

const API_BASE = "https://story-api.dicoding.dev/v1";

function getAuthToken() {
  return authService.getToken();
}

/**
 * Fetch stories dengan token dari auth service
 * @returns {Promise<Array>}
 */
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

    console.log("🔍 DEBUG - Full API Response:", json);

    if (json.error || !json.listStory) {
      console.error("API returned error:", json.message);
      return [];
    }

    const storiesWithCorrectName = json.listStory.map((story) => {
      return {
        id: story.id,
        name: story.name,
        description: story.description,
        photoUrl: story.photoUrl,
        lat: story.lat,
        lon: story.lon,
        createdAt: story.createdAt,
      };
    });

    return storiesWithCorrectName;
  } catch (error) {
    console.error("Error fetching stories:", error);
    return [];
  }
}

export async function postStory({ description, photo, lat, lon }) {
  const token = getAuthToken();

  if (!token) {
    return {
      error: true,
      message: "Anda harus login untuk menambah cerita.",
    };
  }

  if (!description || !photo) {
    return {
      error: true,
      message: "Deskripsi dan foto harus diisi.",
    };
  }

  const formData = new FormData();
  formData.append("description", description);
  formData.append("photo", photo);

  if (lat) formData.append("lat", lat);
  if (lon) formData.append("lon", lon);

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
      console.error("API Error while posting story:", json.message);
      return {
        error: true,
        message: json.message || `Status ${response.status}`,
      };
    }

    return json;
  } catch (error) {
    console.error("Post Network Error:", error);
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
