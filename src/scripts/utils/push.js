const VAPID_PUBLIC_KEY =
  "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";

class PushNotification {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.isSupported = "serviceWorker" in navigator && "PushManager" in window;
    this.isSubscribed = false;
  }

  async init() {
    if (!this.isSupported) {
      console.warn("Push notifications are not supported");
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered");

      // Check current subscription
      this.subscription = await this.registration.pushManager.getSubscription();
      this.isSubscribed = !(this.subscription === null);

      // Update UI based on subscription status
      this.updateSubscriptionStatus();

      return true;
    } catch (error) {
      console.error("Failed to initialize push notifications:", error);
      return false;
    }
  }

  async subscribe() {
    if (!this.isSupported || !this.registration) {
      throw new Error("Push notifications not supported or not initialized");
    }

    try {
      // Subscribe to push notifications
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      this.isSubscribed = true;

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);

      this.updateSubscriptionStatus();

      console.log("User is subscribed to push notifications");
      return true;
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      throw error;
    }
  }

  async unsubscribe() {
    if (!this.isSubscribed || !this.subscription) {
      return true;
    }

    try {
      // Unsubscribe from push notifications
      const success = await this.subscription.unsubscribe();

      if (success) {
        // Remove subscription from server
        await this.removeSubscriptionFromServer(this.subscription);

        this.subscription = null;
        this.isSubscribed = false;

        this.updateSubscriptionStatus();

        console.log("User is unsubscribed from push notifications");
      }

      return success;
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      throw error;
    }
  }

  async sendSubscriptionToServer(subscription) {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(
      "https://story-api.dicoding.dev/v1/notifications/subscribe",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(
              String.fromCharCode(
                ...new Uint8Array(subscription.getKey("p256dh"))
              )
            ),
            auth: btoa(
              String.fromCharCode(
                ...new Uint8Array(subscription.getKey("auth"))
              )
            ),
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to send subscription to server");
    }

    return await response.json();
  }

  async removeSubscriptionFromServer(subscription) {
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    try {
      await fetch("https://story-api.dicoding.dev/v1/notifications/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });
    } catch (error) {
      console.error("Failed to remove subscription from server:", error);
    }
  }

  updateSubscriptionStatus() {
    // Update UI elements based on subscription status
    const subscribeBtn = document.getElementById("subscribe-btn");
    const unsubscribeBtn = document.getElementById("unsubscribe-btn");
    const statusElement = document.getElementById("notification-status");

    if (subscribeBtn) {
      subscribeBtn.style.display = this.isSubscribed ? "none" : "block";
    }
    if (unsubscribeBtn) {
      unsubscribeBtn.style.display = this.isSubscribed ? "block" : "none";
    }
    if (statusElement) {
      statusElement.textContent = this.isSubscribed
        ? "Notifikasi diaktifkan"
        : "Notifikasi dinonaktifkan";
      statusElement.className = this.isSubscribed
        ? "status-enabled"
        : "status-disabled";
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Request notification permission
  async requestPermission() {
    if (!("Notification" in window)) {
      throw new Error("This browser does not support notifications");
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  // Check if notifications are permitted
  checkPermission() {
    return Notification.permission === "granted";
  }

  // Toggle subscription
  async toggleSubscription() {
    if (this.isSubscribed) {
      await this.unsubscribe();
    } else {
      await this.subscribe();
    }
  }

  // Get subscription status
  getStatus() {
    return {
      isSubscribed: this.isSubscribed,
      isSupported: this.isSupported,
      permission: Notification.permission,
    };
  }
}

export const pushNotification = new PushNotification();
