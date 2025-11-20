import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, runTransaction } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyBAFZlPUuuLsrpoq5-bt7AP0uZK7Y3ssfo",
    authDomain: "poopbin-1d55c.firebaseapp.com",
    projectId: "poopbin-1d55c",
    storageBucket: "poopbin-1d55c.firebasestorage.app",
    messagingSenderId: "419162142984",
    appId: "1:419162142984:web:53bd92ebf5dc6c618114bd",
    measurementId: "G-BRB0ERLDEE"
};

export class CounterManager {
    constructor() {
        this.localCount = parseInt(localStorage.getItem('poopbin_local_count') || '0');

        // Initialize Firebase
        this.app = initializeApp(firebaseConfig);
        this.db = getDatabase(this.app);
        this.globalRef = ref(this.db, 'global_clicks');

        this.localCounterEl = document.getElementById('local-counter');
        this.globalCounterEl = document.getElementById('global-counter');

        this.updateLocalDisplay();
        this.initGlobalListener();
    }

    increment() {
        // Local
        this.localCount++;
        localStorage.setItem('poopbin_local_count', this.localCount.toString());
        this.updateLocalDisplay();

        // Global
        runTransaction(this.globalRef, (currentClicks) => {
            return (currentClicks || 0) + 1;
        });
    }

    updateLocalDisplay() {
        if (this.localCounterEl) {
            this.localCounterEl.textContent = this.localCount.toLocaleString();
        }
    }

    initGlobalListener() {
        onValue(this.globalRef, (snapshot) => {
            const data = snapshot.val();
            if (this.globalCounterEl) {
                this.globalCounterEl.textContent = (data || 0).toLocaleString();
            }
        });
    }
}
