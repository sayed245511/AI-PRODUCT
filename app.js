/**
 * ZENTOVA - Official Client App
 * Updated: User & Shop Name Display, Maintenance Mode, Error Fixed
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ১. ফায়ারবেস কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyDVTVu_R_eEkkj9pXwnYr566o1RjfFFPH8",
  authDomain: "ai-product-management-e3ef0.firebaseapp.com",
  projectId: "ai-product-management-e3ef0",
  storageBucket: "ai-product-management-e3ef0.firebasestorage.app",
  messagingSenderId: "471470609003",
  appId: "1:471470609003:web:bb946638c4462fa4bc972e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentShopId = null;
let userRole = 'member';

/**
 * ২. মেইনটেইনেন্স মোড লিসেনার
 */
onSnapshot(doc(db, "settings", "maintenance"), (snapshot) => {
    const maintenanceScreen = document.getElementById('maintenance-screen');
    if (snapshot.exists() && snapshot.data().enabled) {
        if(maintenanceScreen) maintenanceScreen.style.display = 'block';
    } else {
        if(maintenanceScreen) maintenanceScreen.style.display = 'none';
    }
});

/**
 * ৩. লগইন সেশন এবং ইউজার প্রোফাইল লোড
 */
onAuthStateChanged(auth, async (user) => {
    const authPage = document.getElementById('auth-page');
    const mainApp = document.getElementById('main-app');
    
    if (user) {
        if (user.emailVerified) {
            try {
                // ইউজারের প্রোফাইল থেকে ডাটা আনা
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    currentShopId = userData.shopId;
                    userRole = userData.role;

                    // স্ক্রিনে নাম এবং রোল দেখানো
                    document.getElementById('display-user-name').innerText = userData.name || "ইউজার";
                    document.getElementById('display-role').innerText = `Role: ${userRole.toUpperCase()}`;
                    
                    // শপ আইডি দিয়ে দোকানের নাম আনা
                    const shopDoc = await getDoc(doc(db, "shops", currentShopId));
                    if (shopDoc.exists()) {
                        document.getElementById('display-shop-name').innerText = shopDoc.data().shopName || "দোকানের নাম";
                    }

                    // অ্যাডমিন কন্ট্রোল বাটন দেখানো
                    const adminTools = document.getElementById('admin-only-tools');
                    if(adminTools) adminTools.style.display = (userRole === 'admin') ? 'block' : 'none';
                    
                    authPage.style.display = 'none';
                    mainApp.style.display = 'block';
                    showPage('home-menu');
                }
            } catch (e) { 
                console.error("Data Fetch Error:", e); 
            }
        } else {
            alert("আপনার ইমেইলটি ভেরিফাই করুন!");
            window.handleLogout();
        }
    } else {
        if(authPage) authPage.style.display = 'flex';
        if(mainApp) mainApp.style.display = 'none';
    }
});

/**
 * ৪. পন্য ম্যানেজমেন্ট (Shop Isolated)
 */
window.saveProduct = async () => {
    const barcode = document.getElementById('barcode').value.trim();
    const name = document.getElementById('pName').value;
    const sell = document.getElementById('pSell').value;

    if (!barcode || !name || !currentShopId) { alert("সব তথ্য দিন!"); return; }

    try {
        await setDoc(doc(db, "shops", currentShopId, "products", barcode), {
            name, sell, timestamp: serverTimestamp()
        });
        alert("পন্যটি সেভ হয়েছে!");
        location.reload();
    } catch (e) { alert("সেভ করতে ব্যর্থ!"); }
};

window.findProductFromFirebase = async (code) => {
    if (!currentShopId) return;
    try {
        const docSnap = await getDoc(doc(db, "shops", currentShopId, "products", code.trim()));
        if (docSnap.exists()) {
            const p = docSnap.data();
            document.getElementById('resName').innerText = p.name;
            document.getElementById('priceInfo').innerHTML = `মূল্য: ${p.sell} ৳`;
            document.getElementById('displayArea').style.display = 'block';
        } else {
            alert("পন্যটি খুঁজে পাওয়া যায়নি!");
        }
    } catch (e) { console.error(e); }
};

/**
 * ৫. অথেনটিকেশন ফাংশনসমূহ
 */
window.handleLogin = async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } 
    catch (e) { alert("লগইন ব্যর্থ!"); }
};

window.handleSignup = async () => {
    const sName = document.getElementById('shop-name').value;
    const email = document.getElementById('signup-email').value;
    const pass = document.getElementById('signup-pass').value;

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await sendEmailVerification(res.user);
        
        // ডিফল্ট নাম হিসেবে ইমেইল সেট করা (পরে ডাটাবেস থেকে পরিবর্তনযোগ্য)
        await setDoc(doc(db, "users", res.user.uid), { name: "নতুন ইউজার", email, shopId: res.user.uid, role: 'admin' });
        await setDoc(doc(db, "shops", res.user.uid), { shopName: sName, ownerEmail: email, createdAt: serverTimestamp() });
        
        alert("সাইনআপ সফল! ইমেইল ভেরিফাই করুন।");
        window.handleLogout();
    } catch (e) { alert(e.message); }
};

window.handleLogout = () => signOut(auth);

/**
 * ৬. ইউটিলিটি ফাংশন
 */
window.showPage = (id) => {
    const pages = ['home-menu', 'check-page', 'add-page'];
    pages.forEach(p => { if(document.getElementById(p)) document.getElementById(p).style.display = 'none'; });
    const target = document.getElementById(id);
    if(target) target.style.display = (id === 'home-menu') ? 'flex' : 'block';
};

window.toggleAuth = (mode) => {
    document.getElementById('login-form').style.display = (mode === 'login') ? 'block' : 'none';
    document.getElementById('signup-form').style.display = (mode === 'signup') ? 'block' : 'none';
};