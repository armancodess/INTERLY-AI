
import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "interlyai.firebaseapp.com",
  projectId: "interlyai",
  storageBucket: "interlyai.firebasestorage.app",
  messagingSenderId: "998121103176",
  appId: "1:998121103176:web:d636c2c18ebd8609d25d7d"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app)

const provider =new GoogleAuthProvider()

export {auth,provider}