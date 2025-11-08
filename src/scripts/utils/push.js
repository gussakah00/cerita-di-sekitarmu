const VAPID_PUBLIC_KEY =
  "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";

class PushNotification {
  constructor() {
    this.isSupported = "serviceWorker" in navigator && "PushManager" in window;
  }

  async init() {
    if (!this.isSupported) return false;

    try {
      await navigator.serviceWorker.register("/sw.js");
      return true;
    } catch (error) {
      console.error("Failed to initialize push notifications:", error);
      return false;
    }
  }

  async subscribe() {
    if (!this.isSupported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log("User is subscribed:", subscription);
      return true;
    } catch (error) {
      console.error("Failed to subscribe:", error);
      return false;
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
}

export const pushNotification = new PushNotification();
