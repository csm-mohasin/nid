// ocr-worker.js
// ডেডিকেটেড Web Worker — PaddleOCR/ONNX Runtime এই আলাদা থ্রেডে চলে, main
// thread (UI/camera) থেকে সম্পূর্ণ আলাদা memory space এ। এর সুবিধা: main
// thread এ instance.destroy() কল করলে ONNX Runtime এর WASM linear memory
// (একটা বড় ArrayBuffer) পুরোপুরি shrink হয় না — কিছু object reference
// ছাড়া পুরো heap ট্যাবের জীবনকাল ধরে বড়ই থেকে যায়। কিন্তু worker.terminate()
// কল করলে ব্রাউজার পুরো worker thread + তার সব মেমোরি (WASM heap সহ)
// একেবারে OS-কে ফেরত দেয় — এটাই leak-এর আসল, নিশ্চিত সমাধান।

let ocrInstance = null;
let initPromise = null;

async function initOcr() {
  const { PaddleOcrService } = await import('https://esm.sh/ppu-paddle-ocr/web');
  // main thread-এর মতোই CPU execution provider জোর করে সেট করা হচ্ছে —
  // WebGPU backend প্রতি scan-এ বাফার জমায়, যেটা এড়াতে হবে।
  const inst = new PaddleOcrService({
    session: {
      executionProviders: ['cpu'],
      enableCpuMemArena: true,
      enableMemPattern: true,
      executionMode: 'sequential'
    }
  });
  await inst.initialize();
  return inst;
}

self.onmessage = async (e) => {
  const { type, id } = e.data || {};

  if (type === 'init') {
    try {
      if (!initPromise) initPromise = initOcr();
      ocrInstance = await initPromise;
      self.postMessage({ type: 'ready', id });
    } catch (err) {
      self.postMessage({ type: 'error', id, message: 'OCR init ব্যর্থ: ' + err.message });
    }
    return;
  }

  if (type === 'recognize') {
    try {
      if (!ocrInstance) {
        if (!initPromise) initPromise = initOcr();
        ocrInstance = await initPromise;
      }
      const { buffer, width, height } = e.data;
      // main thread থেকে transfer হয়ে আসা raw pixel buffer দিয়ে
      // OffscreenCanvas বানানো হচ্ছে (worker-এ DOM canvas নেই)
      const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.putImageData(imageData, 0, 0);

      const result = await ocrInstance.recognize(canvas);
      const text = (result && result.text) || '';
      self.postMessage({ type: 'result', id, text });

      // worker-এর ভেতরের এই canvas/imageData রেফারেন্স যত দ্রুত সম্ভব
      // ছেড়ে দেওয়ার জন্য সাইজ শূন্য করে দেওয়া হচ্ছে
      canvas.width = 0; canvas.height = 0;
    } catch (err) {
      self.postMessage({ type: 'error', id, message: 'স্ক্যান ব্যর্থ: ' + err.message });
    }
    return;
  }
};
