import routes from "../routes/routes.js";
import { getActiveRoute } from "../routes/url-parser.js";
import { navigation } from "../components/navigation.js";
import { authService } from "../utils/auth.js";

class App {
  _content = null;
  _drawerButton = null;
  _navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this._content = content;
    this._drawerButton = drawerButton;
    this._navigationDrawer = navigationDrawer;

    this._setupDrawer();
    this._setupSkipLink();
    this._initRouter();
    this._initNavigation();
  }

  _initNavigation() {
    navigation.init();
  }

  _setupDrawer() {
    if (!this._drawerButton || !this._navigationDrawer) {
      console.error("Drawer elements not found in DOM.");
      return;
    }

    this._drawerButton.addEventListener("click", () => {
      const isExpanded = this._navigationDrawer.classList.toggle("open");
      this._drawerButton.setAttribute("aria-expanded", isExpanded);

      if (isExpanded) {
        this._drawerButton.innerHTML = "✕";
        this._drawerButton.setAttribute("aria-label", "Tutup menu navigasi");
      } else {
        this._drawerButton.innerHTML = "☰";
        this._drawerButton.setAttribute("aria-label", "Buka menu navigasi");
      }
    });

    document.body.addEventListener("click", (event) => {
      if (
        !this._navigationDrawer.contains(event.target) &&
        !this._drawerButton.contains(event.target) &&
        this._navigationDrawer.classList.contains("open")
      ) {
        this._navigationDrawer.classList.remove("open");
        this._drawerButton.setAttribute("aria-expanded", "false");
        this._drawerButton.innerHTML = "☰";
        this._drawerButton.setAttribute("aria-label", "Buka menu navigasi");
      }
    });

    this._navigationDrawer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 768) {
          this._navigationDrawer.classList.remove("open");
          this._drawerButton.setAttribute("aria-expanded", "false");
          this._drawerButton.innerHTML = "☰";
          this._drawerButton.setAttribute("aria-label", "Buka menu navigasi");
        }
      });
    });
  }

  _setupSkipLink() {
    const skipLink = document.querySelector(".skip-link");
    const mainContent = document.querySelector("#main-content");

    if (skipLink && mainContent) {
      skipLink.addEventListener("click", (e) => {
        e.preventDefault();

        mainContent.focus();

        mainContent.scrollIntoView({ behavior: "smooth" });

        mainContent.style.outline = "2px dashed lightskyblue";
        mainContent.style.outlineOffset = "2px";

        setTimeout(() => {
          mainContent.style.outline = "none";
        }, 3000);
      });
    }
  }

  _initRouter() {
    window.addEventListener("hashchange", () => this.renderPage());
    window.addEventListener("load", () => this.renderPage());
    window.addEventListener("authchange", () => {
      this.renderPage();
      navigation.init();
    });
  }

  async renderPage() {
    if (!this._content) {
      console.error("Content container not found in DOM.");
      return;
    }

    let url = getActiveRoute();

    if (!url || url === "#" || url === "/") {
      if (authService.isLoggedIn()) {
        url = "#/beranda";
      } else {
        url = "#/about";
      }
      window.location.hash = url;
      return;
    }

    if (!authService.isLoggedIn()) {
      const protectedRoutes = ["/beranda", "/add"];
      if (protectedRoutes.includes(url)) {
        console.log("Redirecting to about page - user not logged in");
        url = "#/about";
        window.location.hash = url;
        return;
      }
    }

    if (authService.isLoggedIn()) {
      const authRoutes = ["/login", "/register"];
      if (authRoutes.includes(url)) {
        console.log("Redirecting to home page - user already logged in");
        url = "#/beranda";
        window.location.hash = url;
        return;
      }
    }

    const page = routes[url];

    if (!page) {
      this._showErrorPage(
        "404 - Halaman Tidak Ditemukan",
        "Halaman yang Anda cari tidak ditemukan."
      );
      return;
    }

    try {
      this._content.style.transition = "opacity 0.3s ease";
      this._content.style.opacity = 0;

      await new Promise((resolve) => setTimeout(resolve, 150));

      this._content.innerHTML = await page.render();

      if (typeof page.afterRender === "function") {
        await page.afterRender();
      }

      this._content.style.opacity = 1;

      this._updateDocumentTitle(url);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error rendering page:", error);
      this._showErrorPage(
        "Terjadi Kesalahan",
        "Maaf, terjadi kesalahan saat menampilkan halaman."
      );
    }
  }

  _showErrorPage(title, message) {
    this._content.innerHTML = `
      <section class="error-page" style="text-align: center; padding: 60px 20px;">
        <h1>${title}</h1>
        <p style="margin: 20px 0; color: #666;">${message}</p>
        <div style="margin-top: 30px;">
          <a href="#/beranda" class="primary-button" style="margin-right: 10px;">🏠 Ke Beranda</a>
          <a href="#/about" class="secondary-button">ℹ️ Ke About</a>
        </div>
      </section>
    `;
    this._content.style.opacity = 1;
  }

  _updateDocumentTitle(route) {
    const titleMap = {
      "/beranda": "Beranda - Cerita di Sekitarmu",
      "/about": "Tentang - Cerita di Sekitarmu",
      "/add": "Tambah Cerita - Cerita di Sekitarmu",
      "/login": "Masuk - Cerita di Sekitarmu",
      "/register": "Daftar - Cerita di Sekitarmu",
    };

    document.title = titleMap[route] || "Cerita di Sekitarmu";
  }

  refresh() {
    this.renderPage();
  }

  isUserLoggedIn() {
    return authService.isLoggedIn();
  }

  getUserInfo() {
    return authService.getUser();
  }
}

export default App;
