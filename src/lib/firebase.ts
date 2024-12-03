import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: (import.meta.env as any).VITE_FIREBASE_API_KEY,
  authDomain: (import.meta.env as any).VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta.env as any).VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta.env as any).VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta.env as any).VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta.env as any).VITE_FIREBASE_APP_ID,
  measurementId: (import.meta.env as any).VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Analytics only if in production and supported
let analytics = null;
if ((import.meta.env as any).PROD && firebaseConfig.measurementId) {
  isSupported().then(supported => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
        console.log('Firebase Analytics initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize Firebase Analytics:', error);
      }
    } else {
      console.warn('Firebase Analytics not supported in this environment');
    }
  }).catch(error => {
    console.warn('Error checking Firebase Analytics support:', error);
  });
}

export { app, auth, analytics };
