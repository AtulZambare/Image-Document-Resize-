import { Language } from '../types/processor';

export interface Translations {
  appName: string;
  navWorkspace: string;
  navComparison: string;
  navPrivacy: string;
  downloadAllZip: string;
  clearTemporaryData: string;
  heroTitle: string;
  heroSubtitle: string;
  dropzoneTitle: string;
  dropzoneSubtitle: string;
  browseFiles: string;
  loadSamplePortrait: string;
  supportedFormatsNote: string;
  privacyInlineNote: string;
  controlsHeading: string;
  targetSizeLabel: string;
  targetRangeHint: string;
  customSizePlaceholder: string;
  quickPresetsLabel: string;
  kbUnit: string;
  mbUnit: string;
  dimensionsHeading: string;
  widthPx: string;
  heightPx: string;
  autoPlaceholder: string;
  lockAspectRatio: string;
  aspectRatioNotice: string;
  outputFormatLabel: string;
  formatAuto: string;
  formatJpg: string;
  formatPng: string;
  formatWebp: string;
  faceDetectionHeading: string;
  enableFaceDetection: string;
  faceDetectionDesc: string;
  autoCropToFace: string;
  autoCropDesc: string;
  pdfOptionsHeading: string;
  pdfPreserveText: string;
  pdfPreserveTextDesc: string;
  pdfAllowRaster: string;
  pdfAllowRasterDesc: string;
  processAllBtn: string;
  processingBtn: string;
  queueHeading: string;
  filesCount: string;
  emptyQueueTitle: string;
  emptyQueueDesc: string;
  colFile: string;
  colOriginal: string;
  colOutput: string;
  colReduction: string;
  colStatus: string;
  colActions: string;
  inspectBtn: string;
  cropFaceBtn: string;
  downloadBtn: string;
  removeBtn: string;
  comparisonHeading: string;
  sideBySideMode: string;
  splitSliderMode: string;
  showFaceOverlay: string;
  originalLabel: string;
  compressedLabel: string;
  facesDetectedLabel: string;
  noFacesDetected: string;
  scanningFaces: string;
  manualCropTitle: string;
  manualCropSubtitle: string;
  snapToFaceBtn: string;
  resetCropBtn: string;
  applyCropBtn: string;
  cancelBtn: string;
  cropX: string;
  cropY: string;
  cropWidth: string;
  cropHeight: string;
  cropFaceSafeHint: string;
  reportOriginalSize: string;
  reportFinalSize: string;
  reportTargetLimit: string;
  reportOriginalDims: string;
  reportFinalDims: string;
  reportCompression: string;
  reportFormat: string;
  reportQualityStatus: string;
  reportPages: string;
  reportSearchableText: string;
  yesPreserved: string;
  noRasterized: string;
  statusTargetAchieved: string;
  statusAchievedWithResize: string;
  statusAchievedLowQuality: string;
  statusAlreadyUnderTarget: string;
  statusTargetImpossible: string;
  statusTextPreservedOverTarget: string;
  statusProcessing: string;
  statusPending: string;
  statusError: string;
  warningTargetImpossible: string;
  warningLowQuality: string;
  warningPngLossless: string;
  warningPdfTextPreserved: string;
  warningDimensionScaled: string;
  errUnsupportedType: string;
  errSpoofedSignature: string;
  errFileTooLarge: string;
  errEmptyFile: string;
  errUnsafeContent: string;
  errCorruptedFile: string;
  errTargetRange: string;
  toastSuccessSingle: string;
  toastSuccessBatch: string;
  toastZipReady: string;
  toastCleared: string;
  privacySectionTitle: string;
  privacyPoint1Title: string;
  privacyPoint1Desc: string;
  privacyPoint2Title: string;
  privacyPoint2Desc: string;
  privacyPoint3Title: string;
  privacyPoint3Desc: string;
  privacyPoint4Title: string;
  privacyPoint4Desc: string;
  pdfPageLabel: string;
  prevPage: string;
  nextPage: string;
  dragToCompare: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'Smart Image & Document Resizer',
    navWorkspace: 'Workspace',
    navComparison: 'Comparison',
    navPrivacy: 'Privacy & Security',
    downloadAllZip: 'Download All ZIP',
    clearTemporaryData: 'Clear Temporary Data',
    heroTitle: 'Precision Compression to Exact Target Sizes',
    heroSubtitle:
      'Resize and compress JPG, PNG, WEBP images and PDF documents directly in your browser. Smart face detection keeps portraits natural and unstretched.',
    dropzoneTitle: 'Drop images or PDF documents here',
    dropzoneSubtitle: 'Supports multiple files simultaneously · Processed 100% locally on your device',
    browseFiles: 'Browse Files',
    loadSamplePortrait: 'Try Sample Portrait',
    supportedFormatsNote: 'Accepted: JPG, JPEG, PNG, WEBP, PDF, SVG, BMP, GIF (Max 50 MB each)',
    privacyInlineNote: 'No server uploads · Files are cleared from memory when removed or reset',
    controlsHeading: 'Compression Controls',
    targetSizeLabel: 'Target File Size (55–200 KB)',
    targetRangeHint: 'Strict upper bound: output stays at or below your target whenever technically possible.',
    customSizePlaceholder: 'Custom KB',
    quickPresetsLabel: 'Quick Presets',
    kbUnit: 'KB',
    mbUnit: 'MB',
    dimensionsHeading: 'Dimensions & Aspect Ratio',
    widthPx: 'Width (px)',
    heightPx: 'Height (px)',
    autoPlaceholder: 'Original',
    lockAspectRatio: 'Lock original aspect ratio (never stretch)',
    aspectRatioNotice: 'Proportions are preserved automatically. Stretching faces or layouts is prevented.',
    outputFormatLabel: 'Image Output Format',
    formatAuto: 'Keep Original',
    formatJpg: 'JPG',
    formatPng: 'PNG',
    formatWebp: 'WEBP',
    faceDetectionHeading: 'Smart Face Detection',
    enableFaceDetection: 'Detect faces automatically',
    faceDetectionDesc: 'Identifies faces in portraits to protect proportions, headrooms, and chin framing.',
    autoCropToFace: 'Enable auto-crop to face framing',
    autoCropDesc: 'Disabled by default. Enable only if changing aspect ratio or requesting centered portrait framing.',
    pdfOptionsHeading: 'Document & PDF Engine',
    pdfPreserveText: 'Preserve searchable text & layout',
    pdfPreserveTextDesc: 'Optimizes PDF structure and embedded images without converting text into screenshots.',
    pdfAllowRaster: 'Allow page re-rendering if target is unreachable',
    pdfAllowRasterDesc: 'Only used if text-preserving compression cannot fit the strict KB limit.',
    processAllBtn: 'Compress & Resize All',
    processingBtn: 'Processing...',
    queueHeading: 'Uploaded Files',
    filesCount: 'files',
    emptyQueueTitle: 'No files uploaded yet',
    emptyQueueDesc: 'Upload images or PDF documents above, or load the sample portrait to inspect face detection and target-KB compression.',
    colFile: 'File',
    colOriginal: 'Original',
    colOutput: 'Compressed',
    colReduction: 'Reduction',
    colStatus: 'Quality Status',
    colActions: 'Actions',
    inspectBtn: 'Inspect',
    cropFaceBtn: 'Crop / Face',
    downloadBtn: 'Download',
    removeBtn: 'Remove',
    comparisonHeading: 'Side-by-Side Comparison & Report',
    sideBySideMode: 'Side-by-Side',
    splitSliderMode: 'Split Slider',
    showFaceOverlay: 'Face Frame Guides',
    originalLabel: 'Original',
    compressedLabel: 'Compressed Output',
    facesDetectedLabel: 'faces detected',
    noFacesDetected: 'No faces detected',
    scanningFaces: 'Scanning for faces...',
    manualCropTitle: 'Manual Crop & Face Framing',
    manualCropSubtitle: 'Drag or adjust values below. Snap to the detected face keeps head, chin, and shoulders safely inside the frame.',
    snapToFaceBtn: 'Center on Detected Face',
    resetCropBtn: 'Reset to Full Image',
    applyCropBtn: 'Apply Crop & Recompress',
    cancelBtn: 'Cancel',
    cropX: 'Left (px)',
    cropY: 'Top (px)',
    cropWidth: 'Crop Width (px)',
    cropHeight: 'Crop Height (px)',
    cropFaceSafeHint: 'Safe portrait headroom and chin padding are included automatically.',
    reportOriginalSize: 'Original Size',
    reportFinalSize: 'Final Size',
    reportTargetLimit: 'Target Limit',
    reportOriginalDims: 'Original Dimensions',
    reportFinalDims: 'Final Dimensions',
    reportCompression: 'Size Reduction',
    reportFormat: 'Output Format',
    reportQualityStatus: 'Quality Status',
    reportPages: 'Pages',
    reportSearchableText: 'Searchable Text',
    yesPreserved: 'Preserved',
    noRasterized: 'Rasterized',
    statusTargetAchieved: 'Target Achieved',
    statusAchievedWithResize: 'Achieved (Proportional Scale)',
    statusAchievedLowQuality: 'Achieved (Heavy Compression)',
    statusAlreadyUnderTarget: 'Already Within Limit',
    statusTargetImpossible: 'Target Exceeded (Closest Possible)',
    statusTextPreservedOverTarget: 'Text Preserved (Above Limit)',
    statusProcessing: 'Processing',
    statusPending: 'Queued',
    statusError: 'Error',
    warningTargetImpossible:
      'Exact target size could not be reached without unacceptable quality loss. Closest high-readability result is provided.',
    warningLowQuality:
      'Target size required strong compression. Please inspect the preview for fine text or detail sharpness.',
    warningPngLossless:
      'Lossless PNG resists extreme size reduction. Switch output format to WEBP or JPG for smaller file sizes with better visual quality.',
    warningPdfTextPreserved:
      'Searchable text and vector layout were preserved, so size could not drop below the embedded font/vector minimum. Enable page re-rendering only if strict KB size outweighs searchable text.',
    warningDimensionScaled:
      'Dimensions were proportionally scaled down (without stretching) to satisfy the target file size limit.',
    errUnsupportedType: 'Unsupported file format. Please upload JPG, PNG, WEBP, PDF, SVG, BMP, or GIF files.',
    errSpoofedSignature: 'File header does not match its extension. Blocked for security.',
    errFileTooLarge: 'File exceeds the 50 MB browser safety limit.',
    errEmptyFile: 'File is empty (0 bytes) and cannot be processed.',
    errUnsafeContent: 'Potentially unsafe script content was detected and blocked.',
    errCorruptedFile: 'Could not decode this file. It may be corrupted or password-protected.',
    errTargetRange: 'Target size must be between 55 KB and 200 KB.',
    toastSuccessSingle: 'File processed and verified successfully.',
    toastSuccessBatch: 'All files processed and verified.',
    toastZipReady: 'ZIP archive downloaded successfully.',
    toastCleared: 'All temporary files and previews cleared from browser memory.',
    privacySectionTitle: 'Local Privacy & Upload Security',
    privacyPoint1Title: '100% Browser-Local Execution',
    privacyPoint1Desc: 'Photos and PDFs are processed in your device memory using Canvas, Web Workers, and local models. Nothing is sent to external servers.',
    privacyPoint2Title: 'Magic-Byte File Verification',
    privacyPoint2Desc: 'Every file is checked by binary signature—not just filename extension—to block spoofed or malicious uploads.',
    privacyPoint3Title: 'Zero Permanent Storage',
    privacyPoint3Desc: 'Object URLs and temporary buffers are revoked immediately when you remove a file or click Clear Temporary Data.',
    privacyPoint4Title: 'Honest Output Verification',
    privacyPoint4Desc: 'Final byte counts are measured after encoding. If a target KB cannot be met honestly, the app reports the true size and warns you.',
    pdfPageLabel: 'Page',
    prevPage: 'Prev',
    nextPage: 'Next',
    dragToCompare: 'Drag handle to compare',
  },
  mr: {
    appName: 'स्मार्ट इमेज आणि डॉक्युमेंट रिझायझर',
    navWorkspace: 'कार्यक्षेत्र',
    navComparison: 'तुलना',
    navPrivacy: 'गोपनीयता आणि सुरक्षा',
    downloadAllZip: 'सर्व ZIP डाउनलोड करा',
    clearTemporaryData: 'तात्पुरता डेटा पुसा',
    heroTitle: 'अचूक लक्ष्य आकारापर्यंत स्मार्ट कॉम्प्रेशन',
    heroSubtitle:
      'तुमच्या ब्राउझरमध्येच JPG, PNG, WEBP फोटो आणि PDF दस्तऐवज कॉम्प्रेस व रिझाइझ करा. स्मार्ट फेस डिटेक्शनमुळे चेहऱ्याचे मूळ प्रमाण सुरक्षित राहते.',
    dropzoneTitle: 'फोटो किंवा PDF दस्तऐवज येथे टाका',
    dropzoneSubtitle: 'एकाच वेळी अनेक फाइल्स निवडा · सर्व प्रक्रिया पूर्णपणे तुमच्या डिव्हाइसवर होते',
    browseFiles: 'फाइल्स निवडा',
    loadSamplePortrait: 'नमुना पोर्ट्रेट वापरा',
    supportedFormatsNote: 'स्वीकृत प्रकार: JPG, JPEG, PNG, WEBP, PDF, SVG, BMP, GIF (कमाल 50 MB)',
    privacyInlineNote: 'सर्व्हरवर अपलोड नाही · काढून टाकल्यावर तात्पुरत्या फाइल्स मेमरीतून पुसल्या जातात',
    controlsHeading: 'कॉम्प्रेशन नियंत्रणे',
    targetSizeLabel: 'लक्ष्य फाइल आकार (55–200 KB)',
    targetRangeHint: 'अचूक कमाल मर्यादा: तांत्रिकदृष्ट्या शक्य असेल तेव्हा आउटपुट तुमच्या लक्ष्य KB पेक्षा कमी किंवा तितकेच राहील.',
    customSizePlaceholder: 'कस्टम KB',
    quickPresetsLabel: 'जलद पर्याय',
    kbUnit: 'KB',
    mbUnit: 'MB',
    dimensionsHeading: 'आकारमान आणि प्रमाण (Dimensions)',
    widthPx: 'रुंदी (px)',
    heightPx: 'उंची (px)',
    autoPlaceholder: 'मूळ',
    lockAspectRatio: 'मूळ गुणोत्तर लॉक ठेवा (फोटो ताणला जाणार नाही)',
    aspectRatioNotice: 'मूळ प्रमाण आपोआप जपले जाते. चेहरा किंवा मजकूर कधीही ताणला जाणार नाही.',
    outputFormatLabel: 'आउटपुट फॉरमॅट',
    formatAuto: 'मूळ फॉरमॅट ठेवा',
    formatJpg: 'JPG',
    formatPng: 'PNG',
    formatWebp: 'WEBP',
    faceDetectionHeading: 'स्मार्ट फेस डिटेक्शन',
    enableFaceDetection: 'चेहरे आपोआप ओळखा',
    faceDetectionDesc: 'पोर्ट्रेटमधील चेहरा ओळखून डोक्याचा भाग, हनुवटी आणि मूळ प्रमाण सुरक्षित ठेवते.',
    autoCropToFace: 'चेहऱ्यानुसार ऑटो-क्रॉप सुरू करा',
    autoCropDesc: 'डीफॉल्टनुसार बंद असते. फक्त नवीन गुणोत्तर किंवा चेहरा मध्यभागी हवा असल्यास सुरू करा.',
    pdfOptionsHeading: 'दस्तऐवज आणि PDF इंजिन',
    pdfPreserveText: 'शोधण्यायोग्य मजकूर व मांडणी जपा',
    pdfPreserveTextDesc: 'मजकूर स्क्रीनशॉटमध्ये न बदलता PDF रचना आणि आतील चित्रे कॉम्प्रेस करते.',
    pdfAllowRaster: 'लक्ष्य आकार न साधल्यास पेज री-रेंडर करण्याची परवानगी द्या',
    pdfAllowRasterDesc: 'मजकूर जपून लक्ष्य KB गाठणे अशक्य असल्यासच हा पर्याय वापरा.',
    processAllBtn: 'सर्व कॉम्प्रेस व रिझाइझ करा',
    processingBtn: 'प्रक्रिया सुरू आहे...',
    queueHeading: 'अपलोड केलेल्या फाइल्स',
    filesCount: 'फाइल्स',
    emptyQueueTitle: 'अद्याप कोणतीही फाइल अपलोड केलेली नाही',
    emptyQueueDesc: 'वरील बॉक्समध्ये फोटो किंवा PDF टाका, किंवा फेस डिटेक्शन तपासण्यासाठी नमुना पोर्ट्रेट निवडा.',
    colFile: 'फाइल',
    colOriginal: 'मूळ आकार',
    colOutput: 'कॉम्प्रेस केलेला',
    colReduction: 'बचत',
    colStatus: 'गुणवत्ता स्थिती',
    colActions: 'कृती',
    inspectBtn: 'पहा',
    cropFaceBtn: 'क्रॉप / चेहरा',
    downloadBtn: 'डाउनलोड',
    removeBtn: 'काढा',
    comparisonHeading: 'तुलना आणि सविस्तर अहवाल',
    sideBySideMode: 'बाजू-बाजूला तुलना',
    splitSliderMode: 'स्प्लिट स्लायडर',
    showFaceOverlay: 'चेहरा फ्रेम मार्गदर्शक',
    originalLabel: 'मूळ फाइल',
    compressedLabel: 'कॉम्प्रेस केलेली फाइल',
    facesDetectedLabel: 'चेहरे आढळले',
    noFacesDetected: 'कोणताही चेहरा आढळला नाही',
    scanningFaces: 'चेहरे तपासत आहे...',
    manualCropTitle: 'मॅन्युअल क्रॉप आणि फेस फ्रेमिंग',
    manualCropSubtitle: 'खालील आकडे बदला किंवा फ्रेम ओढा. चेहऱ्यावर केंद्रित केल्यास डोके आणि हनुवटी सुरक्षित राहते.',
    snapToFaceBtn: 'ओळखलेल्या चेहऱ्यावर केंद्रित करा',
    resetCropBtn: 'पूर्ण फोटो निवडा',
    applyCropBtn: 'क्रॉप लागू करा व पुन्हा कॉम्प्रेस करा',
    cancelBtn: 'रद्द करा',
    cropX: 'डावी बाजू (px)',
    cropY: 'वरची बाजू (px)',
    cropWidth: 'क्रॉप रुंदी (px)',
    cropHeight: 'क्रॉप उंची (px)',
    cropFaceSafeHint: 'डोक्यावरील आणि हनुवटीखालील सुरक्षित जागा आपोआप जपली जाते.',
    reportOriginalSize: 'मूळ फाइल आकार',
    reportFinalSize: 'अंतिम फाइल आकार',
    reportTargetLimit: 'लक्ष्य मर्यादा',
    reportOriginalDims: 'मूळ आकारमान',
    reportFinalDims: 'अंतिम आकारमान',
    reportCompression: 'आकार बचत',
    reportFormat: 'आउटपुट फॉरमॅट',
    reportQualityStatus: 'गुणवत्ता स्थिती',
    reportPages: 'पाने',
    reportSearchableText: 'शोधण्यायोग्य मजकूर',
    yesPreserved: 'जपलेला',
    noRasterized: 'रास्टराइज्ड',
    statusTargetAchieved: 'लक्ष्य साध्य झाले',
    statusAchievedWithResize: 'साध्य (प्रमाणबद्ध रिझाइझ)',
    statusAchievedLowQuality: 'साध्य (तीव्र कॉम्प्रेशन)',
    statusAlreadyUnderTarget: 'आधीच मर्यादेत आहे',
    statusTargetImpossible: 'मर्यादेपेक्षा मोठी (शक्य तितकी जवळ)',
    statusTextPreservedOverTarget: 'मजकूर जपला (मर्यादेपेक्षा मोठी)',
    statusProcessing: 'प्रक्रिया सुरू',
    statusPending: 'प्रतीक्षेत',
    statusError: 'त्रुटी',
    warningTargetImpossible:
      'अतिरिक्त गुणवत्ता न गमावता नेमका लक्ष्य आकार गाठणे तांत्रिकदृष्ट्या अशक्य आहे. सर्वोत्तम शक्य परिणाम दिला आहे.',
    warningLowQuality:
      'लक्ष्य आकारासाठी तीव्र कॉम्प्रेशन करावे लागले. कृपया बारीक मजकूर व स्पष्टता तपासा.',
    warningPngLossless:
      'लॉसलेस PNG फाइल्सचा आकार कमी करण्यास मर्यादा असतात. अधिक चांगल्या गुणवत्तेसह लहान आकारासाठी WEBP किंवा JPG निवडा.',
    warningPdfTextPreserved:
      'शोधण्यायोग्य मजकूर आणि मांडणी जपली असल्यामुळे फाइलचा आकार किमान मर्यादेखाली जाऊ शकला नाही. कठोर KB मर्यादेसाठी पेज री-रेंडर पर्याय वापरू शकता.',
    warningDimensionScaled:
      'लक्ष्य फाइल आकार गाठण्यासाठी फोटोचे आकारमान प्रमाणबद्धपणे (न ताणता) लहान केले आहे.',
    errUnsupportedType: 'हा फाइल प्रकार समर्थित नाही. कृपया JPG, PNG, WEBP, PDF, SVG, BMP किंवा GIF फाइल निवडा.',
    errSpoofedSignature: 'फाइलचा मूळ डेटा तिच्या एक्स्टेंशनशी जुळत नाही. सुरक्षेसाठी ब्लॉक केली आहे.',
    errFileTooLarge: 'फाइल 50 MB च्या सुरक्षित मर्यादेपेक्षा मोठी आहे.',
    errEmptyFile: 'ही फाइल रिकामी (0 bytes) आहे आणि प्रक्रिया करता येत नाही.',
    errUnsafeContent: 'धोकादायक स्क्रिप्ट आढळल्यामुळे फाइल सुरक्षिततेसाठी थांबवली आहे.',
    errCorruptedFile: 'ही फाइल उघडता आली नाही. ती खराब किंवा पासवर्ड-संरक्षित असू शकते.',
    errTargetRange: 'लक्ष्य आकार 55 KB ते 200 KB दरम्यान असावा.',
    toastSuccessSingle: 'फाइल यशस्वीरित्या कॉम्प्रेस व तपासली गेली.',
    toastSuccessBatch: 'सर्व फाइल्स यशस्वीरित्या प्रक्रिया पूर्ण झाल्या.',
    toastZipReady: 'ZIP फाइल यशस्वीरित्या डाउनलोड झाली.',
    toastCleared: 'सर्व तात्पुरत्या फाइल्स आणि प्रिव्ह्यू मेमरीतून पुसले गेले.',
    privacySectionTitle: 'स्थानिक गोपनीयता आणि अपलोड सुरक्षा',
    privacyPoint1Title: '१००% ब्राउझरमध्ये प्रक्रिया',
    privacyPoint1Desc: 'तुमचे फोटो आणि PDF तुमच्याच डिव्हाइसवर Canvas, Web Workers आणि स्थानिक मॉडेल्सद्वारे प्रक्रिया केले जातात.',
    privacyPoint2Title: 'मॅजिक-बाइट फाइल तपासणी',
    privacyPoint2Desc: 'बनावट किंवा धोकादायक फाइल्स रोखण्यासाठी केवळ नावाऐवजी फाइलची बायनरी रचना तपासली जाते.',
    privacyPoint3Title: 'कायमस्वरूपी साठवणूक नाही',
    privacyPoint3Desc: 'तुम्ही फाइल काढताच किंवा डेटा पुसा बटण दाबताच सर्व तात्पुरता डेटा मेमरीतून काढून टाकला जातो.',
    privacyPoint4Title: 'अचूक आणि प्रामाणिक मोजमाप',
    privacyPoint4Desc: 'प्रत्येक आउटपुट फाइलचा खरा आकार एन्कोडिंगनंतर मोजला जातो. लक्ष्य अशक्य असल्यास तशी स्पष्ट सूचना दिली जाते.',
    pdfPageLabel: 'पान',
    prevPage: 'मागील',
    nextPage: 'पुढील',
    dragToCompare: 'तुलनेसाठी स्लायडर ओढा',
  },
};
