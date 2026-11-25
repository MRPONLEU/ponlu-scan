# P-Scan (Ponlu-Scan)

កម្មវិធីស្កេនឯកសារលើទូរសព្ទដៃជាភាសាខ្មែរ (បែប CamScanner) បង្កើតដោយ React + Vite + Tailwind CSS + Capacitor Android។

## មុខងារសំខាន់ៗ
- ថតរូបឯកសារតាមកាមេរ៉ា (Batch multi-page, Grid, Flash) ឬនាំចូលរូបភាព
- ស្វែងរកគែមក្រដាសស្វ័យប្រវត្តិ និងកាត់តម្រង់ជ្រុង 4 (Perspective Warp + Magnifying Loupe)
- Filter ពណ៌ឯកសារ៖ ដើម, ពណ៌ច្បាស់ (Magic), បំភ្លឺ, ស-ខ្មៅ (Adaptive B&W), ប្រផេះ + កែពន្លឺ/កម្រិតពណ៌
- រក្សាទុកឯកសារច្រើនទំព័រក្នុង IndexedDB និងនាំចេញជា PDF (A4 ឬ ទំហំដើម) / JPEG / ZIP
- បំប្លែង PDF ទៅជា JPEG (`pdfjs-dist` + `jszip`)
- OCR ដកស្រង់អក្សរខ្មែរ និងអង់គ្លេសពីរូបភាព (`tesseract.js` `4.0.0_best`)
- ស្កេន QR Code តាមកាមេរ៉ា និងពីរូបភាព (`jsqr`)

## របៀបដំណើរការ
```bash
npm install
npm run dev
```
ឬចុចបើក `run.bat` លើ Windows។
