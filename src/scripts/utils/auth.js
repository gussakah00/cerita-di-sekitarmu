class AuthService {
  constructor() {
    this.tokenKey = "token";
    this.userKey = "user";
  }

  login(token, userData) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(userData));
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getUser() {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  getUserName() {
    const user = this.getUser();
    return user ? user.name : "User";
  }

  isLoggedIn() {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
