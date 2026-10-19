// Firebase project settings for accounts + the friends leaderboard (free "Spark" plan, see README → Accounts).
// Paste the `firebaseConfig` object from the Firebase console here. These values are not secret:
// every web app ships them to the browser; the rules in firestore.rules protect the data.
// While this is null the app works exactly as before: no login, progress only in the browser.
export const firebaseConfig: {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId: string
} | null = {
  apiKey: 'AIzaSyDikW9HPOjq-DXxp9c52PbBFCRvG2r41hc',
  authDomain: 'country-capitals-46231.firebaseapp.com',
  projectId: 'country-capitals-46231',
  storageBucket: 'country-capitals-46231.firebasestorage.app',
  messagingSenderId: '37435527225',
  appId: '1:37435527225:web:ac66951e1a9d46a8e67de8',
}
