// ================================================================
// voter-shared.js
// এখানে তোমার Firebase প্রজেক্টের config বসাও (Firebase Console →
// Project settings → General → Your apps → SDK setup and config)
// ================================================================
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDfYa-3Au4hJVKq8oKftaj0YEg1d7yqbzM",
  authDomain: "niddd-c03b8.firebaseapp.com",
  projectId: "niddd-c03b8",
  storageBucket: "niddd-c03b8.firebasestorage.app",
  messagingSenderId: "716407466574",
  appId: "1:716407466574:web:61c60e0fd9bd6221c1711f"
};
// Firestore-এ ভোটারদের কালেকশনের নাম — দুই ফাইলেই এটাই ব্যবহার হবে
export const VOTERS_COLLECTION = "voters";

// ---------------- বাংলা সংখ্যা -> ইংরেজি সংখ্যা ----------------
const BN_DIGIT_MAP = {'০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'};
export function bnToEnDigits(str){
  return String(str || '').replace(/[০-৯]/g, d => BN_DIGIT_MAP[d]);
}

// ---------------- DOB normalize ----------------
// দুই রকম ইনপুট আসতে পারে:
//   ১) কাগজের ভোটার লিস্ট থেকে: "০২/০৫/১৯৬৭" (DD/MM/YYYY, বাংলা সংখ্যা)
//   ২) NID কার্ড স্ক্যান থেকে: "01 Jan 1990" (DD Mon YYYY)
// দুটোকেই "YYYY-MM-DD"-তে normalize করে যাতে সার্চে সরাসরি মেলানো যায়।
const MONTH_INDEX = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};

export function normalizeDob(raw){
  if(!raw) return '';
  const s = bnToEnDigits(raw).trim();

  let m = s.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/);
  if(m){
    const day = m[1].padStart(2,'0');
    const mon = m[2].padStart(2,'0');
    return `${m[3]}-${mon}-${day}`;
  }

  m = s.match(/(\d{1,2})\s*([A-Za-z]{3,9})\s*(\d{4})/);
  if(m){
    const day = m[1].padStart(2,'0');
    const monNum = MONTH_INDEX[m[2].slice(0,3).toLowerCase()];
    if(!monNum) return '';
    return `${m[3]}-${String(monNum).padStart(2,'0')}-${day}`;
  }
  return '';
}

export function dobYear(raw){
  const iso = normalizeDob(raw);
  return iso ? iso.slice(0,4) : '';
}

// DOB-কে দেখানোর জন্য সুন্দর ফরম্যাটে ফেরত (YYYY-MM-DD -> DD/MM/YYYY)
export function displayDob(iso){
  if(!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
