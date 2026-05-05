// sw.js — Service Worker for Daniel Wisdom Hub
// Handles FCM push messages and notification clicks

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAKMI3LZwlPO-VungZEz3T8_eNwbuSBfhw",
  authDomain: "daniel-wisdom-hub.firebaseapp.com",
  projectId: "daniel-wisdom-hub",
  storageBucket: "daniel-wisdom-hub.firebasestorage.app",
  messagingSenderId: "911988639155",
  appId: "1:911988639155:web:e1b781c3054734536c77c6"
});

const messaging = firebase.messaging();

// Handle background push messages
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const link = payload.fcmOptions?.link || payload.data?.url || '/';
  self.registration.showNotification(title || 'Daniel Wisdom Hub ✨', {
    body: body || '',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: { url: link }
  });
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Cache for offline support
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
