// @/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBKqLdXc-TBQPonkyd5f97-u6-x1HQu4xw",
  authDomain: "ratatoingcommunications.firebaseapp.com",
  databaseURL: "https://ratatoingcommunications-default-rtdb.firebaseio.com",
  projectId: "ratatoingcommunications",
  storageBucket: "ratatoingcommunications.firebasestorage.app",
  messagingSenderId: "1059264838874",
  appId: "1:1059264838874:web:717442d7d1063784ff79e3",
  measurementId: "G-73MHJW5LWZ"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database as firebaseDb };