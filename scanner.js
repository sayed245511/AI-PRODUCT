/**
 * Zentova Multi-Database Scanner - Safe Version
 */
let html5QrCode;

window.startScanner = function(mode) {
    const readerId = (mode === 'save') ? "reader_add" : "reader";
    const readerDiv = document.getElementById(readerId);
    if(readerDiv) readerDiv.style.display = 'block';
    
    html5QrCode = new Html5Qrcode(readerId);
    
    const config = {
        fps: 30,
        qrbox: { width: 300, height: 150 },
        videoConstraints: { focusMode: "continuous", facingMode: "environment" }
    };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        async (code) => {
            const cleanCode = code.trim();
            if(mode === 'save') {
                const barcodeInput = document.getElementById('barcode');
                if(barcodeInput) barcodeInput.value = cleanCode;
                fetchAllDatabases(cleanCode); 
            } else {
                if(window.findProductFromFirebase) window.findProductFromFirebase(cleanCode);
            }
            stopScanner(readerId);
        }
    ).catch(err => console.error("Scanner error:", err));
};

window.stopScanner = function(readerId) {
    if(html5QrCode) {
        html5QrCode.stop().then(() => {
            const div = document.getElementById(readerId);
            if(div) div.style.display = 'none';
        }).catch(err => console.warn(err));
    }
};

async function fetchAllDatabases(barcode) {
    const status = document.getElementById('statusText');
    const pName = document.getElementById('pName');
    const pBrand = document.getElementById('pBrand');
    
    if(status) {
        status.innerText = "ইন্টারনেটে তথ্য খোঁজা হচ্ছে...";
        status.style.color = "#00d2ff";
    }

    const apis = [
        { name: "Food Facts", url: `https://world.openfoodfacts.org/api/v0/product/${barcode}.json` },
        { name: "Beauty Facts", url: `https://world.openbeautyfacts.org/api/v0/product/${barcode}.json` }
    ];

    for (let api of apis) {
        try {
            const res = await fetch(api.url);
            const data = await res.json();
            
            if (data.status === 1) {
                const product = data.product;
                if(pName) pName.value = product.product_name || product.generic_name || "";
                if(pBrand) pBrand.value = product.brands || "";
                
                if(status) {
                    status.innerText = `${api.name} থেকে তথ্য পাওয়া গেছে!`;
                    status.style.color = "#00e676";
                }
                return;
            }
        } catch (e) { console.warn(api.name + " failed."); }
    }

    if(status) {
        status.innerText = "ডাটাবেসে নেই। নিজে লিখে সেভ করুন।";
        status.style.color = "#ff9100";
    }
}