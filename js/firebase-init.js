import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, remove, update, get, query, orderByChild, equalTo, limitToLast, limitToFirst } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBe5Ie0XSSPILwfKEyAVj5rhf__OM4dkxQ",
    authDomain: "buka-8ff8d.firebaseapp.com",
    databaseURL: "https://buka-8ff8d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "buka-8ff8d",
    storageBucket: "buka-8ff8d.firebasestorage.app",
    messagingSenderId: "822785440381",
    appId: "1:822785440381:web:030be8db496a99407acf14"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.fbDb = db;
window.fbRef = ref;
window.fbOnValue = onValue;
window.fbSet = set;
window.fbPush = push;
window.fbRemove = remove;
window.fbUpdate = update;
window.fbGet = get;
window.fbQuery = query;
window.fbOrderByChild = orderByChild;
window.fbEqualTo = equalTo;
window.fbLimitToLast = limitToLast;
window.fbLimitToFirst = limitToFirst;

window.getAppRef = function(path) {
    let t = localStorage.getItem('active_tournament') || 'default';
    if (t === 'default') {
        return ref(db, path);
    } else {
        return ref(db, `tournaments_data/${t}/${path}`);
    }
};

export { db, ref, onValue, set, push, remove, update, get, query, orderByChild, equalTo, limitToLast, limitToFirst };
