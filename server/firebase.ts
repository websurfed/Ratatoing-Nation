import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://ratatoingcommunications-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const firebaseDb = getDatabase(app); 

export { firebaseDb }; 