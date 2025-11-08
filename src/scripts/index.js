import App from "./pages/app.js";
import "../styles/styles.css";
import "leaflet/dist/leaflet.css";

const app = new App({
  drawerButton: document.querySelector("#drawer-button"),
  navigationDrawer: document.querySelector("#navigation-drawer"),
  content: document.querySelector("#main-content"),
});

window.addEventListener("hashchange", () => app.renderPage());
window.addEventListener("load", () => app.renderPage());
