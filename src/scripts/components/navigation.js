import { authService } from "../utils/auth.js";

class Navigation {
  constructor() {
    this.navElement = null;
    this.updateNavigation = this.updateNavigation.bind(this);
  }

  init() {
    this.navElement = document.getElementById("nav-list");
    this.updateNavigation();

    window.addEventListener("authchange", this.updateNavigation);
  }

  updateNavigation() {
    if (!this.navElement) return;

    const isLoggedIn = authService.isLoggedIn();
    const userName = authService.getUserName();

    if (isLoggedIn) {
      this.navElement.innerHTML = `
        <li><a href="#/beranda" class="nav-link">Beranda</a></li>
        <li><a href="#/about" class="nav-link">About</a></li>
        <li><a href="#/add" class="nav-link">Tambah Cerita</a></li>
        <li class="nav-user">
          <button id="logout-btn" class="logout-button" aria-label="Keluar dari akun">Keluar</button>
        </li>
      `;

      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", this.handleLogout.bind(this));
      }
    } else {
      this.navElement.innerHTML = `
        <li><a href="#/about" class="nav-link">About</a></li>
        <li><a href="#/login" class="nav-link">Masuk</a></li>
        <li><a href="#/register" class="nav-link">Daftar</a></li>
      `;
    }
  }

  handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
      authService.logout();
      window.dispatchEvent(new Event("authchange"));
      window.location.hash = "#/about";

      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <h1>Berhasil Keluar</h1>
            <p>Anda telah berhasil keluar dari akun.</p>
            <p>Mengarahkan ke halaman about...</p>
          </div>
        `;
      }
    }
  }
}

export const navigation = new Navigation();
