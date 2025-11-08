import L from "leaflet";
import { postStory } from "../../data/api.js";
import { authService } from "../../utils/auth.js";
// Asumsi: idbService akan di-import di sini jika sudah dibuat.
// import { idbService } from "../../data/idb-service.js";

const AddPage = {
  _map: null,
  _marker: null,
  _latitude: null,
  _longitude: null,
  _stream: null,
  _capturedBlob: null,

  _markIcon: L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),

  async render() {
    if (!authService.isLoggedIn()) {
      return `
        <section class="add-story" aria-labelledby="add-title">
          <h1 id="add-title" tabindex="0">Akses Ditolak</h1>
          <div style="text-align: center; padding: 40px;">
            <p>Anda harus login untuk menambah cerita.</p>
            <a href="#/login" class="link">Masuk</a> atau 
            <a href="#/register" class="link">Daftar akun baru</a>
          </div>
        </section>
      `;
    }

    return `
      <section class="add-story" aria-labelledby="add-title">
        <h1 id="add-title" tabindex="0">Tambah Cerita Baru</h1>
        <div class="form-container">
          <form id="addStoryForm" aria-labelledby="add-title">
            <p id="form-message" class="info-message" aria-live="polite" style="display:none;"></p>

            <div class="form-section">
              <h2>Pilih Lokasi Cerita</h2>
              <p class="form-help">Klik pada peta untuk memilih lokasi cerita Anda (opsional)</p>
              <div id="map-picker" style="height: 300px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #ddd;" 
                   aria-label="Peta untuk memilih lokasi cerita"></div>
              
              <div class="coordinates-display">
                <div class="coordinate-field">
                  <label for="latitude">Latitude:</label>
                  <input type="text" id="latitude" name="lat" readonly aria-label="Latitude lokasi yang dipilih">
                </div>
                <div class="coordinate-field">
                  <label for="longitude">Longitude:</label>
                  <input type="text" id="longitude" name="lon" readonly aria-label="Longitude lokasi yang dipilih">
                </div>
              </div>
            </div>

            <div class="form-section">
              <h2>Detail Cerita</h2>
              
              <div class="form-group">
                <label for="title">Judul Cerita:</label>
                <input type="text" id="title" name="title" required aria-required="true" 
                       placeholder="Masukkan judul cerita Anda" aria-describedby="title-help">
                <p id="title-help" class="form-help">Beri judul yang menarik untuk cerita Anda</p>
                <p id="title-error" class="error-message" style="display:none;" aria-live="polite"></p>
              </div>

              <div class="form-group">
                <label for="description">Deskripsi Cerita:</label>
                <textarea id="description" name="description" required aria-required="true" 
                          placeholder="Tuliskan isi cerita Anda di sini..." 
                          rows="5" aria-describedby="description-help"></textarea>
                <p id="description-help" class="form-help">Ceritakan pengalaman atau momen spesial Anda</p>
                <p id="description-error" class="error-message" style="display:none;" aria-live="polite"></p>
              </div>
            </div>

            <div class="form-section">
              <h2>Foto Cerita</h2>
              
              <div class="form-group">
                <label for="photoType">Pilih Sumber Gambar:</label>
                <select id="photoType" name="photoType" aria-describedby="photoType-help">
                  <option value="file">Upload File Gambar</option>
                  <option value="camera">Ambil dari Kamera</option>
                </select>
                <p id="photoType-help" class="form-help">Pilih cara untuk menambahkan foto cerita</p>
              </div>

              <div id="fileUploadContainer" class="upload-section">
                <label for="photo">Upload Foto:</label>
                <input type="file" id="photo" name="photo" accept="image/*" required aria-required="true"
                       aria-describedby="photo-help">
                <p id="photo-help" class="form-help">Format: JPG, PNG, GIF. Maksimal 5MB</p>
                <div id="filePreview" class="image-preview" style="display:none;">
                  <img id="filePreviewImage" src="#" alt="Pratinjau gambar yang diupload" style="max-width: 100%; max-height: 200px;">
                </div>
              </div>

              <div id="cameraContainer" class="upload-section" style="display:none;">
                <div class="camera-controls">
                  <video id="videoElement" width="320" height="240" autoplay 
                         aria-label="Pratinjau kamera" style="border-radius: 8px;"></video>
                  <canvas id="canvasElement" width="320" height="240" style="display:none;"></canvas>
                  
                  <div class="camera-buttons">
                    <button type="button" id="captureButton" class="secondary-button">Ambil Foto</button>
                    <button type="button" id="retakeButton" class="secondary-button" style="display:none;">Ambil Ulang</button>
                  </div>
                </div>
                
                <p id="camera-status" class="info-message" aria-live="polite" style="display:none;"></p>
                
                <div id="capturedImagePreview" class="image-preview" style="display:none;">
                  <img id="capturedPreviewImage" src="#" alt="Pratinjau foto yang diambil" style="max-width: 100%; max-height: 200px;">
                  <p class="form-help">Foto berhasil diambil! Klik "Ambil Ulang" jika ingin mengganti.</p>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" id="submitButton" class="primary-button">
                Kirim Cerita
              </button>
              <button type="button" id="cancelButton" class="secondary-button">
                Batal
              </button>
            </div>
          </form>
        </div>
      </section>
    `;
  },

  async afterRender() {
    if (!authService.isLoggedIn()) {
      return;
    }

    this._initMap();
    this._setupFormInteractivity();
  },

  /**
   * Menginisialisasi peta Leaflet.
   */
  _initMap() {
    try {
      this._map = L.map("map-picker").setView([-6.2, 106.8], 5); // Default: Jakarta
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(this._map);

      this._map.on("click", (e) => this._onMapClick(e));

      // Set default marker and coordinates
      this._latitude = "-6.200000";
      this._longitude = "106.800000";
      this._marker = L.marker([this._latitude, this._longitude], {
        icon: this._markIcon,
      })
        .addTo(this._map)
        .bindPopup("Lokasi default: Jakarta")
        .openPopup();

      document.querySelector("#latitude").value = this._latitude;
      document.querySelector("#longitude").value = this._longitude;
    } catch (error) {
      console.error("Error initializing map:", error);
      document.getElementById("map-picker").innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <p>Gagal memuat peta. Pastikan koneksi internet Anda stabil.</p>
        </div>
      `;
    }
  },

  /**
   * Menangani klik pada peta untuk menempatkan marker dan mendapatkan koordinat.
   * @param {Object} e - Event klik Leaflet.
   */
  _onMapClick(e) {
    if (this._marker) {
      this._map.removeLayer(this._marker);
    }

    this._latitude = e.latlng.lat.toFixed(6);
    this._longitude = e.latlng.lng.toFixed(6);

    this._marker = L.marker([this._latitude, this._longitude], {
      icon: this._markIcon,
    })
      .addTo(this._map)
      .bindPopup(`Lokasi terpilih: ${this._latitude}, ${this._longitude}`)
      .openPopup();

    document.querySelector("#latitude").value = this._latitude;
    document.querySelector("#longitude").value = this._longitude;
  },

  /**
   * Mengatur interaktivitas form, termasuk upload foto/kamera dan submit.
   */
  _setupFormInteractivity() {
    const form = document.querySelector("#addStoryForm");
    const photoTypeSelect = document.querySelector("#photoType");
    const fileUploadContainer = document.querySelector("#fileUploadContainer");
    const cameraContainer = document.querySelector("#cameraContainer");
    const videoElement = document.querySelector("#videoElement");
    const canvasElement = document.querySelector("#canvasElement");
    const captureButton = document.querySelector("#captureButton");
    const retakeButton = document.querySelector("#retakeButton");
    const filePreview = document.querySelector("#filePreview");
    const filePreviewImage = document.querySelector("#filePreviewImage");
    const capturedImagePreview = document.querySelector(
      "#capturedImagePreview"
    );
    const capturedPreviewImage = document.querySelector(
      "#capturedPreviewImage"
    );
    const photoInput = document.querySelector("#photo");
    const messageDisplay = document.querySelector("#form-message");
    const cancelButton = document.querySelector("#cancelButton");
    const submitButton = document.querySelector("#submitButton");

    const closeMediaStream = () => {
      if (this._stream) {
        this._stream.getTracks().forEach((track) => track.stop());
        this._stream = null;
        videoElement.srcObject = null;
      }
    };

    // Event: File input change (for upload type)
    photoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          messageDisplay.textContent =
            "Ukuran file terlalu besar. Maksimal 5MB.";
          messageDisplay.style.backgroundColor = "#fee";
          messageDisplay.style.display = "block";
          photoInput.value = "";
          filePreview.style.display = "none";
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          filePreviewImage.src = e.target.result;
          filePreview.style.display = "block";
        };
        reader.readAsDataURL(file);
        messageDisplay.style.display = "none";
      }
    });

    // Event: Photo type change (file vs camera)
    photoTypeSelect.addEventListener("change", async (e) => {
      const type = e.target.value;
      this._capturedBlob = null;
      capturedImagePreview.style.display = "none";
      filePreview.style.display = "none";
      photoInput.required = type === "file";
      messageDisplay.style.display = "none";

      if (type === "camera") {
        fileUploadContainer.style.display = "none";
        cameraContainer.style.display = "block";
        retakeButton.style.display = "none";
        captureButton.style.display = "block";

        try {
          this._stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240 },
          });
          videoElement.srcObject = this._stream;
          document.querySelector("#camera-status").textContent =
            "Kamera aktif. Silakan ambil foto.";
          document.querySelector("#camera-status").style.display = "block";
          document.querySelector("#camera-status").style.backgroundColor =
            "#e8f5e8";
        } catch (err) {
          console.error("Gagal mengakses kamera: ", err);
          document.querySelector("#camera-status").textContent =
            "Gagal mengakses kamera. Periksa izin perangkat Anda.";
          document.querySelector("#camera-status").style.backgroundColor =
            "#fee";
          document.querySelector("#camera-status").style.display = "block";
          closeMediaStream();
        }
      } else {
        closeMediaStream();
        cameraContainer.style.display = "none";
        fileUploadContainer.style.display = "block";
        document.querySelector("#camera-status").style.display = "none";
      }
    });

    // Event: Capture photo
    captureButton.addEventListener("click", () => {
      if (this._stream) {
        const context = canvasElement.getContext("2d");
        // Ensure the canvas size matches the video frame size
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        context.drawImage(
          videoElement,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );

        canvasElement.toBlob((blob) => {
          this._capturedBlob = new File([blob], "story-photo.png", {
            type: "image/png",
          });
          capturedPreviewImage.src = URL.createObjectURL(blob);
          capturedImagePreview.style.display = "block";
          retakeButton.style.display = "block";
          captureButton.style.display = "none";
          document.querySelector("#camera-status").textContent =
            "Foto berhasil diambil!";
          document.querySelector("#camera-status").style.backgroundColor =
            "#e8f5e8";

          closeMediaStream();
        }, "image/png");
      }
    });

    // Event: Retake photo
    retakeButton.addEventListener("click", async () => {
      capturedImagePreview.style.display = "none";
      retakeButton.style.display = "none";
      captureButton.style.display = "block";
      this._capturedBlob = null;

      try {
        this._stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
        });
        videoElement.srcObject = this._stream;
        document.querySelector("#camera-status").textContent =
          "Kamera aktif. Silakan ambil foto.";
        document.querySelector("#camera-status").style.backgroundColor =
          "#e8f5e8";
      } catch (err) {
        console.error("Gagal mengakses kamera: ", err);
        document.querySelector("#camera-status").textContent =
          "Gagal mengakses kamera.";
        document.querySelector("#camera-status").style.backgroundColor = "#fee";
      }
    });

    // Event: Cancel button
    cancelButton.addEventListener("click", () => {
      if (
        confirm(
          "Apakah Anda yakin ingin membatalkan? Data yang sudah diisi akan hilang."
        )
      ) {
        closeMediaStream();
        window.location.hash = "#/beranda";
      }
    });

    // Cleanup media stream when navigating away
    window.addEventListener("hashchange", closeMediaStream);

    // Event: Form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      messageDisplay.style.display = "none";

      const isFormValid = this._validateForm(form);

      if (!isFormValid) {
        messageDisplay.textContent =
          "Mohon periksa input Anda. Pastikan semua field wajib diisi dengan benar.";
        messageDisplay.style.backgroundColor = "#fee";
        messageDisplay.style.display = "block";
        return;
      }

      const formData = new FormData(form);
      let photoFile = null;

      if (photoTypeSelect.value === "camera" && this._capturedBlob) {
        photoFile = this._capturedBlob;
      } else if (photoTypeSelect.value === "file" && photoInput.files[0]) {
        photoFile = photoInput.files[0];
      } else {
        messageDisplay.textContent = "Mohon pilih atau ambil foto.";
        messageDisplay.style.backgroundColor = "#fee";
        messageDisplay.style.display = "block";
        return;
      }

      const title = formData.get("title").trim();
      const description = formData.get("description").trim();

      // Combine title and description as required by the backend format
      const combinedDescription = `**${title}**\n${description}`;

      const dataToSend = {
        description: combinedDescription,
        photo: photoFile,
        // Use this._latitude/longitude as they contain the map data, even if null/default
        lat: this._latitude ? parseFloat(this._latitude) : null,
        lon: this._longitude ? parseFloat(this._longitude) : null,
      };

      // --- OFFLINE FIRST IMPLEMENTATION START ---
      const isOnline = navigator.onLine;
      if (!isOnline) {
        // Cek apakah idbService sudah di-import/didefinisikan
        if (typeof idbService !== "undefined" && idbService.saveOfflineStory) {
          await this._handleOfflineSubmission(dataToSend);
          return;
        } else {
          messageDisplay.textContent =
            "Anda sedang offline. Fitur offline submission tidak tersedia. Coba lagi saat online.";
          messageDisplay.style.backgroundColor = "#fff3cd";
          messageDisplay.style.color = "#856404";
          messageDisplay.style.display = "block";
          return;
        }
      }
      // --- OFFLINE FIRST IMPLEMENTATION END ---

      submitButton.disabled = true;
      submitButton.innerHTML = "Mengirim...";
      messageDisplay.textContent = "Mengirim cerita Anda...";
      messageDisplay.style.backgroundColor = "#e3f2fd";
      messageDisplay.style.display = "block";

      try {
        const response = await postStory(dataToSend);

        if (response.error) {
          throw new Error(response.message || "Gagal mengirim data ke API.");
        }

        messageDisplay.textContent =
          "Cerita berhasil ditambahkan! Mengarahkan ke Beranda...";
        messageDisplay.style.backgroundColor = "#e8f5e8";

        closeMediaStream();

        setTimeout(() => {
          window.location.hash = "#/beranda";
        }, 2000);
      } catch (error) {
        console.error("Error posting story:", error);
        messageDisplay.textContent = `Gagal mengirim cerita: ${error.message}`;
        messageDisplay.style.backgroundColor = "#fee";
        submitButton.disabled = false;
        submitButton.innerHTML = "Kirim Cerita";
      }
    });
  },

  /**
   * Menangani validasi form sebelum submit.
   * @param {HTMLFormElement} form - Elemen form yang akan divalidasi.
   * @returns {boolean} - True jika form valid, false jika tidak.
   */
  _validateForm(form) {
    let isValid = true;
    const titleInput = form.querySelector("#title");
    const descInput = form.querySelector("#description");
    const photoTypeSelect = form.querySelector("#photoType");
    const photoInput = form.querySelector("#photo");

    const titleError = document.querySelector("#title-error");
    const descError = document.querySelector("#description-error");

    // Clear previous errors
    [titleError, descError].forEach((el) => {
      if (el) {
        el.style.display = "none";
        el.textContent = "";
      }
    });

    titleInput.setCustomValidity("");
    descInput.setCustomValidity("");

    const titleValue = titleInput.value.trim();
    if (!titleValue) {
      if (titleError) {
        titleError.textContent = "Judul cerita wajib diisi.";
        titleError.style.display = "block";
      }
      isValid = false;
    } else if (titleValue.length < 2) {
      if (titleError) {
        titleError.textContent = "Judul minimal 2 karakter.";
        titleError.style.display = "block";
      }
      isValid = false;
    }

    const descValue = descInput.value.trim();
    if (!descValue) {
      if (descError) {
        descError.textContent = "Deskripsi cerita wajib diisi.";
        descError.style.display = "block";
      }
      isValid = false;
    } else if (descValue.length < 5) {
      if (descError) {
        descError.textContent = "Deskripsi minimal 5 karakter.";
        descError.style.display = "block";
      }
      isValid = false;
    }

    const photoType = photoTypeSelect.value;
    if (photoType === "file") {
      if (!photoInput.files || !photoInput.files[0]) {
        isValid = false;
      }
    } else if (photoType === "camera") {
      if (!this._capturedBlob) {
        isValid = false;
      }
    }

    return isValid;
  },

  /**
   * Menangani penyimpanan cerita secara offline ke IndexedDB dan mendaftarkan Background Sync.
   * @param {Object} dataToSend - Objek data cerita yang akan disimpan.
   */
  async _handleOfflineSubmission(dataToSend) {
    const messageDisplay = document.querySelector("#form-message");
    const submitButton = document.querySelector("#submitButton");

    // Nonaktifkan tombol submit
    submitButton.disabled = true;
    submitButton.innerHTML = "Menyimpan Offline...";

    try {
      // Simpan ke IndexedDB (idbService diasumsikan sudah ada di scope)
      await idbService.saveOfflineStory(dataToSend);

      messageDisplay.textContent =
        "Cerita disimpan secara offline dan akan dikirim ketika koneksi tersedia!";
      messageDisplay.style.backgroundColor = "#fff3cd";
      messageDisplay.style.color = "#856404";
      messageDisplay.style.display = "block";

      // Register background sync
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register("sync-offline-stories");
      }

      this.closeMediaStream();

      setTimeout(() => {
        window.location.hash = "#/beranda";
      }, 3000);
    } catch (error) {
      console.error("Error saving offline story:", error);
      messageDisplay.textContent =
        "Gagal menyimpan cerita offline: " + error.message;
      messageDisplay.style.backgroundColor = "#fee";
      messageDisplay.style.display = "block";

      // Kembalikan tombol submit
      submitButton.disabled = false;
      submitButton.innerHTML = "Kirim Cerita";
    }
  },
};

export default AddPage;
