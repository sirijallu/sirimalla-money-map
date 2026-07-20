# Firebase setup — Google Sign-In + Firestore

The app runs in **local mode** until you complete these steps. Nothing here
touches your code except step 3 (pasting the config). ~5 minutes.

## 1. Create a Firebase project
1. Go to <https://console.firebase.google.com> → **Add project**.
2. Name it (e.g. `sirimalla-money-map`). Google Analytics is optional (Off is fine).

## 2. Add a Web app + copy the config
1. In the project, click the **Web** icon (`</>`) → register an app (nickname
   `money-map-web`). You do **not** need Firebase Hosting.
2. Copy the `firebaseConfig` object it shows you.

## 3. Paste the config into the app
Open [`js/config/firebase-config.js`](js/config/firebase-config.js) and fill in
the values (they are not secret — they ship to the browser; access is controlled
by the rules in step 5):

```js
export const firebaseConfig = {
  apiKey: 'AIza…',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef…',
};
```

The app auto-detects this (`isFirebaseConfigured`) and switches auth + storage to
Firebase — no other code change.

## 4. Enable Google sign-in
Firebase console → **Authentication** → **Get started** → **Sign-in method** →
**Google** → **Enable** → pick a support email → **Save**.

## 5. Create Firestore + publish the rules
1. **Firestore Database** → **Create database** → **Production mode** → pick a
   region → **Enable**.
2. Open the **Rules** tab, paste the contents of
   [`firestore.rules`](firestore.rules), and **Publish**. These restrict every
   user to their own `users/{uid}/…` subtree.

## 6. Authorize your domains
Authentication → **Settings** → **Authorized domains** → make sure these are
listed (add any that are missing):
- `localhost`
- your production domain, e.g. `sirimalla-money-map.vercel.app`

## 7. Run it
- Local: `npm start`, open the app, click **Continue with Google**.
- The first time you sign in, any data you created in local mode is copied up to
  the cloud automatically (your local copy is kept as a backup).

---

### Data layout in Firestore
```
users/{uid}/state/transactions   → { value: [ …transactions ], updatedAt }
users/{uid}/state/categories     → { value: [ …categories ] }
users/{uid}/state/rules          → { value: [ …user rules ] }
users/{uid}/state/mappings       → { value: { merchantKey: categoryId } }
users/{uid}/state/budgets        → { value: { [year]: { catId: limit } } }
```

### Notes
- The Firebase SDK loads lazily from `gstatic.com` only when configured, so
  local mode stays offline-friendly. If you later add a Content-Security-Policy,
  allow `https://www.gstatic.com` (scripts) and `*.googleapis.com` (Firestore).
- Transactions are stored as a single document per collection today (simple,
  ~1 MiB/user-year headroom). Splitting transactions into their own per-doc
  subcollection is a planned scaling step — see `DEVELOPMENT.md`.
