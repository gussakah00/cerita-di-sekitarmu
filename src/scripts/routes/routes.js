import HomePage from "../pages/home/home-page.js";
import AboutPage from "../pages/about/about-page.js";
import AddPage from "../pages/add/add-page.js";
import LoginPage from "../pages/auth/login-page.js";
import RegisterPage from "../pages/auth/register-page.js";

const routes = {
  "/beranda": HomePage,
  "/about": AboutPage,
  "/add": AddPage,
  "/login": LoginPage,
  "/register": RegisterPage,
};

export default routes;
