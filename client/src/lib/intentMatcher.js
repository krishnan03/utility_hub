/**
 * Intent Matcher — maps natural-language queries to tools.
 *
 * Instead of pure keyword search, this understands phrases like
 * "I need to fix this messy JSON" → JSON Formatter, or
 * "make this text lowercase" → Text Utilities.
 *
 * Each intent has:
 *  - patterns: regex patterns that match user phrasing
 *  - toolId: the tool registry ID to surface
 *  - action: a short verb phrase shown as a hint (e.g. "Format JSON")
 */

const INTENTS = [
  // ── JSON / Data ────────────────────────────────────────────────────
  { patterns: [/fix\s*(my\s+)?messy\s+json/i, /format\s*(my\s+)?json/i, /beautif(y|ier)\s+json/i, /pretty\s*print\s+json/i, /clean\s*up\s+json/i, /indent\s+json/i, /minif(y|ier)\s+json/i], toolId: 'json-yaml-xml', action: 'Format JSON' },
  { patterns: [/convert\s+json\s+to\s+yaml/i, /json\s*→?\s*yaml/i, /yaml\s+from\s+json/i], toolId: 'json-yaml-xml', action: 'Convert JSON → YAML' },
  { patterns: [/convert\s+yaml\s+to\s+json/i, /yaml\s*→?\s*json/i], toolId: 'json-yaml-xml', action: 'Convert YAML → JSON' },
  { patterns: [/convert\s+json\s+to\s+xml/i, /json\s*→?\s*xml/i], toolId: 'json-yaml-xml', action: 'Convert JSON → XML' },
  { patterns: [/validate\s+(my\s+)?json\s+schema/i, /json\s+schema\s+valid/i], toolId: 'json-schema', action: 'Validate JSON Schema' },
  { patterns: [/jsonpath/i, /json\s*path\s*(test|query|express)/i], toolId: 'json-path-tester', action: 'Test JSONPath' },
  { patterns: [/flatten\s+(nested\s+)?json/i, /json\s+flatten/i], toolId: 'json-flattener', action: 'Flatten JSON' },

  // ── Text manipulation ──────────────────────────────────────────────
  { patterns: [/make\s*(this\s+)?text\s+lowercase/i, /lowercase\s*(my\s+)?text/i, /to\s+lower\s*case/i, /convert\s+to\s+lowercase/i], toolId: 'text-utilities', action: 'Convert to lowercase' },
  { patterns: [/make\s*(this\s+)?text\s+uppercase/i, /uppercase\s*(my\s+)?text/i, /to\s+upper\s*case/i, /capitalize\s+all/i, /convert\s+to\s+uppercase/i], toolId: 'text-utilities', action: 'Convert to UPPERCASE' },
  { patterns: [/count\s*(the\s+)?words/i, /word\s+count/i, /how\s+many\s+words/i, /character\s+count/i], toolId: 'text-utilities', action: 'Count words' },
  { patterns: [/find\s+and\s+replace/i, /search\s+and\s+replace/i, /replace\s+text/i], toolId: 'text-utilities', action: 'Find & Replace' },
  { patterns: [/summarize\s*(this\s+)?(text|article|content)/i, /make\s*(this\s+)?shorter/i, /tldr/i, /shorten\s*(this\s+)?text/i], toolId: 'text-summarizer', action: 'Summarize text' },
  { patterns: [/check\s*(my\s+)?grammar/i, /fix\s*(my\s+)?grammar/i, /spell\s*check/i, /proofread/i], toolId: 'grammar-checker', action: 'Check grammar' },
  { patterns: [/paraphrase/i, /rewrite\s*(this\s+)?text/i, /rephrase/i, /say\s+this\s+differently/i], toolId: 'paraphraser', action: 'Paraphrase text' },
  { patterns: [/read\s*(this\s+)?(text\s+)?aloud/i, /text\s+to\s+speech/i, /speak\s+this/i, /tts/i], toolId: 'text-to-speech', action: 'Text to Speech' },
  { patterns: [/plagiarism/i, /check\s+for\s+cop(y|ying)/i, /is\s+this\s+original/i], toolId: 'plagiarism-checker', action: 'Check plagiarism' },

  // ── PDF ─────────────────────────────────────────────────────────────
  { patterns: [/merge\s*(my\s+)?pdfs?/i, /combine\s*(my\s+)?pdfs?/i, /join\s+pdfs?/i], toolId: 'pdf-merge', action: 'Merge PDFs' },
  { patterns: [/split\s*(a\s+)?pdf/i, /separate\s+pdf\s+pages/i, /extract\s+pages?\s+from\s+pdf/i], toolId: 'pdf-split', action: 'Split PDF' },
  { patterns: [/compress\s*(a\s+)?pdf/i, /make\s*(my\s+)?pdf\s+smaller/i, /reduce\s+pdf\s+size/i, /shrink\s+pdf/i], toolId: 'pdf-compress', action: 'Compress PDF' },
  { patterns: [/edit\s*(a\s+)?pdf/i, /annotate\s+pdf/i, /add\s+text\s+to\s+pdf/i, /write\s+on\s+pdf/i], toolId: 'pdf-editor', action: 'Edit PDF' },
  { patterns: [/sign\s*(a\s+)?pdf/i, /e-?sign/i, /add\s+(my\s+)?signature/i, /put\s+signature\s+on/i], toolId: 'pdf-esignature', action: 'Sign PDF' },
  { patterns: [/protect\s*(a\s+)?pdf/i, /password\s+protect\s+pdf/i, /encrypt\s+pdf/i, /lock\s+pdf/i], toolId: 'pdf-protect', action: 'Protect PDF' },
  { patterns: [/unlock\s*(a\s+)?pdf/i, /remove\s+pdf\s+password/i, /decrypt\s+pdf/i], toolId: 'pdf-unlock', action: 'Unlock PDF' },
  { patterns: [/add\s+page\s+numbers?\s+to\s+pdf/i, /number\s+pdf\s+pages/i], toolId: 'pdf-page-numbers', action: 'Add page numbers' },
  { patterns: [/watermark\s*(a\s+)?pdf/i, /add\s+watermark/i, /stamp\s+pdf/i], toolId: 'pdf-watermark', action: 'Add watermark' },
  { patterns: [/compare\s+pdfs?/i, /diff\s+pdfs?/i, /pdf\s+side\s+by\s+side/i], toolId: 'pdf-compare', action: 'Compare PDFs' },
  { patterns: [/redact\s+pdf/i, /black\s*out\s+pdf/i, /censor\s+pdf/i, /hide\s+text\s+in\s+pdf/i], toolId: 'pdf-redact', action: 'Redact PDF' },
  { patterns: [/crop\s+pdf/i, /trim\s+pdf/i], toolId: 'pdf-crop', action: 'Crop PDF' },
  { patterns: [/ocr/i, /extract\s+text\s+from\s+(scanned\s+)?pdf/i, /scan(ned)?\s+pdf\s+to\s+text/i], toolId: 'pdf-ocr', action: 'OCR — extract text' },
  { patterns: [/pdf\s+to\s+word/i, /convert\s+pdf\s+to\s+docx/i], toolId: 'pdf-to-word', action: 'PDF → Word' },
  { patterns: [/word\s+to\s+pdf/i, /convert\s+docx?\s+to\s+pdf/i], toolId: 'word-to-pdf', action: 'Word → PDF' },
  { patterns: [/pdf\s+to\s+excel/i, /extract\s+table\s+from\s+pdf/i], toolId: 'pdf-to-excel', action: 'PDF → Excel' },
  { patterns: [/html\s+to\s+pdf/i, /web\s*page\s+to\s+pdf/i], toolId: 'html-to-pdf', action: 'HTML → PDF' },
  { patterns: [/ppt\s+to\s+pdf/i, /powerpoint\s+to\s+pdf/i, /slides?\s+to\s+pdf/i], toolId: 'ppt-to-pdf', action: 'PowerPoint → PDF' },

  // ── Image ───────────────────────────────────────────────────────────
  { patterns: [/convert\s*(my\s+)?image/i, /change\s+image\s+format/i, /png\s+to\s+jpg/i, /jpg\s+to\s+png/i, /webp\s+to/i, /to\s+webp/i], toolId: 'image-convert', action: 'Convert image' },
  { patterns: [/compress\s*(my\s+)?image/i, /make\s*(my\s+)?image\s+smaller/i, /reduce\s+image\s+size/i, /optimize\s+image/i, /shrink\s+image/i], toolId: 'image-compress', action: 'Compress image' },
  { patterns: [/resize\s*(my\s+)?image/i, /scale\s+image/i, /change\s+image\s+(size|dimensions)/i, /make\s+image\s+(bigger|smaller)/i], toolId: 'image-resize', action: 'Resize image' },
  { patterns: [/remove\s*(the\s+)?background/i, /transparent\s+background/i, /cut\s*out\s+background/i, /bg\s+remov/i], toolId: 'image-bg-remove', action: 'Remove background' },
  { patterns: [/edit\s*(my\s+)?image/i, /crop\s+image/i, /rotate\s+image/i, /flip\s+image/i], toolId: 'image-edit', action: 'Edit image' },
  { patterns: [/edit\s*(my\s+)?photo/i, /add\s+filter/i, /photo\s+filter/i, /adjust\s+brightness/i], toolId: 'photo-editor', action: 'Edit photo' },
  { patterns: [/heic\s+to\s+jpg/i, /convert\s+iphone\s+photo/i, /heif\s+to/i], toolId: 'heic-to-jpg', action: 'HEIC → JPG' },
  { patterns: [/svg\s+to\s+png/i, /convert\s+svg/i], toolId: 'svg-to-png', action: 'SVG → PNG' },
  { patterns: [/image\s+to\s+pdf/i, /photo\s+to\s+pdf/i, /picture\s+to\s+pdf/i], toolId: 'image-to-pdf', action: 'Image → PDF' },
  { patterns: [/image\s+metadata/i, /exif\s+data/i, /strip\s+metadata/i, /view\s+exif/i, /remove\s+exif/i], toolId: 'image-metadata', action: 'View image metadata' },

  // ── Developer ───────────────────────────────────────────────────────
  { patterns: [/decode\s*(a\s+)?jwt/i, /jwt\s+decode/i, /inspect\s+token/i, /parse\s+jwt/i], toolId: 'jwt-decoder', action: 'Decode JWT' },
  { patterns: [/test\s*(my\s+)?regex/i, /regex\s+test/i, /regular\s+expression/i, /match\s+pattern/i], toolId: 'regex-tester', action: 'Test regex' },
  { patterns: [/parse\s+cron/i, /cron\s+expression/i, /next\s+cron\s+run/i, /cron\s+schedule/i], toolId: 'cron-parser', action: 'Parse cron' },
  { patterns: [/build\s+cron/i, /crontab/i, /visual\s+cron/i, /create\s+cron/i], toolId: 'crontab-guru', action: 'Build cron expression' },
  { patterns: [/convert\s+timestamp/i, /unix\s+timestamp/i, /epoch\s+to\s+date/i, /date\s+to\s+epoch/i], toolId: 'timestamp-converter', action: 'Convert timestamp' },
  { patterns: [/minif(y|ier)\s+css/i, /beautif(y|ier)\s+css/i, /format\s+css/i, /compress\s+css/i], toolId: 'css-minify', action: 'Format CSS' },
  { patterns: [/minif(y|ier)\s+html/i, /beautif(y|ier)\s+html/i, /format\s+html/i, /compress\s+html/i], toolId: 'html-minify', action: 'Format HTML' },
  { patterns: [/format\s+sql/i, /beautif(y|ier)\s+sql/i, /pretty\s+sql/i, /indent\s+sql/i], toolId: 'sql-formatter', action: 'Format SQL' },
  { patterns: [/diff\s+check/i, /compare\s+(two\s+)?texts?/i, /text\s+diff/i, /find\s+differences/i, /what\s+changed/i], toolId: 'diff-checker', action: 'Compare text' },
  { patterns: [/encode\s+url/i, /decode\s+url/i, /url\s+encode/i, /percent\s+encod/i], toolId: 'url-encoder', action: 'Encode/Decode URL' },
  { patterns: [/base64\s+(encode|decode|file)/i, /encode\s+to\s+base64/i, /decode\s+base64/i], toolId: 'base64-file', action: 'Base64 encode/decode' },
  { patterns: [/convert\s+(to\s+)?binary/i, /binary\s+to\s+(hex|decimal)/i, /hex\s+to\s+binary/i, /number\s+system/i], toolId: 'binary-converter', action: 'Convert number systems' },
  { patterns: [/chmod/i, /file\s+permission/i, /unix\s+permission/i, /rwx/i], toolId: 'chmod-calculator', action: 'Calculate chmod' },
  { patterns: [/color\s+code\s+convert/i, /hex\s+to\s+rgb/i, /rgb\s+to\s+hex/i, /hsl\s+to\s+hex/i], toolId: 'color-code-converter', action: 'Convert color codes' },
  { patterns: [/api\s+(request|test|build)/i, /send\s+http/i, /postman/i, /rest\s+client/i, /curl\s+request/i], toolId: 'api-builder', action: 'Build API request' },
  { patterns: [/generate\s+(fake|random|mock|test)\s+data/i, /faker/i, /dummy\s+data/i, /lorem\s+ipsum/i], toolId: 'random-generator', action: 'Generate random data' },

  // ── Security ────────────────────────────────────────────────────────
  { patterns: [/generate\s*(a\s+)?password/i, /strong\s+password/i, /random\s+password/i, /secure\s+password/i], toolId: 'password-generator', action: 'Generate password' },
  { patterns: [/generate\s*(a\s+)?hash/i, /md5\s+hash/i, /sha\s+hash/i, /hash\s+text/i], toolId: 'hash-generator', action: 'Generate hash' },
  { patterns: [/checksum/i, /verify\s+file\s+integrity/i, /file\s+hash/i], toolId: 'checksum-calculator', action: 'Calculate checksum' },
  { patterns: [/generate\s*(a\s+)?uuid/i, /random\s+uuid/i, /ulid/i, /unique\s+id/i], toolId: 'uuid-generator', action: 'Generate UUID' },
  { patterns: [/encrypt\s*(a\s+)?file/i, /decrypt\s*(a\s+)?file/i, /file\s+encryption/i, /aes\s+encrypt/i], toolId: 'file-encryption', action: 'Encrypt file' },
  { patterns: [/totp/i, /2fa\s+(code|test)/i, /authenticator\s+code/i, /two\s+factor/i], toolId: 'totp-generator', action: 'Generate TOTP' },
  { patterns: [/breach\s+check/i, /have\s+i\s+been\s+pwned/i, /email\s+leak/i, /password\s+leak/i, /data\s+breach/i], toolId: 'breach-checker', action: 'Check for breaches' },

  // ── Spreadsheet ─────────────────────────────────────────────────────
  { patterns: [/excel\s+to\s+csv/i, /xlsx\s+to\s+csv/i, /convert\s+excel\s+to\s+csv/i], toolId: 'excel-to-csv', action: 'Excel → CSV' },
  { patterns: [/csv\s+to\s+excel/i, /csv\s+to\s+xlsx/i], toolId: 'csv-to-excel', action: 'CSV → Excel' },
  { patterns: [/excel\s+to\s+json/i, /xlsx\s+to\s+json/i], toolId: 'excel-to-json', action: 'Excel → JSON' },
  { patterns: [/json\s+to\s+excel/i, /json\s+to\s+xlsx/i], toolId: 'json-to-excel', action: 'JSON → Excel' },
  { patterns: [/view\s+csv/i, /edit\s+csv/i, /open\s+csv/i, /csv\s+viewer/i], toolId: 'csv-viewer', action: 'View CSV' },
  { patterns: [/merge\s+csv/i, /combine\s+csv/i, /join\s+csv/i], toolId: 'merge-csv', action: 'Merge CSV files' },
  { patterns: [/remove\s+duplicate/i, /dedup/i, /csv\s+duplicate/i], toolId: 'csv-deduplicate', action: 'Remove duplicates' },
  { patterns: [/csv\s+to\s+sql/i, /generate\s+sql\s+from\s+csv/i, /insert\s+statements/i], toolId: 'csv-to-sql', action: 'CSV → SQL' },
  { patterns: [/pivot\s+table/i, /cross\s*tab/i, /aggregate\s+csv/i], toolId: 'pivot-table', action: 'Create pivot table' },
  { patterns: [/edit\s+excel/i, /online\s+excel/i, /spreadsheet\s+editor/i, /open\s+xlsx/i], toolId: 'excel-editor', action: 'Edit Excel' },

  // ── Finance ─────────────────────────────────────────────────────────
  { patterns: [/compound\s+interest/i, /investment\s+growth/i, /savings\s+calculator/i], toolId: 'compound-interest', action: 'Calculate compound interest' },
  { patterns: [/emi\s+calculat/i, /loan\s+emi/i, /monthly\s+installment/i], toolId: 'emi-calculator', action: 'Calculate EMI' },
  { patterns: [/income\s+tax/i, /tax\s+calculat/i, /estimate\s+tax/i], toolId: 'tax-calculator', action: 'Calculate tax' },
  { patterns: [/sip\s+calculat/i, /mutual\s+fund\s+return/i, /systematic\s+investment/i], toolId: 'sip-calculator', action: 'Calculate SIP' },
  { patterns: [/retirement\s+(plan|calculat)/i, /fire\s+calculat/i, /pension/i], toolId: 'retirement-calculator', action: 'Plan retirement' },
  { patterns: [/currency\s+convert/i, /exchange\s+rate/i, /usd\s+to\s+eur/i], toolId: 'currency-converter', action: 'Convert currency' },
  { patterns: [/crypto\s+(convert|price)/i, /bitcoin\s+to/i, /eth\s+to/i], toolId: 'crypto-converter', action: 'Convert crypto' },
  { patterns: [/options?\s+(profit|calculat)/i, /call\s+option/i, /put\s+option/i], toolId: 'options-calculator', action: 'Calculate options profit' },

  // ── Utility ─────────────────────────────────────────────────────────
  { patterns: [/generate\s*(a\s+)?qr/i, /qr\s+code/i, /make\s+qr/i, /create\s+qr/i], toolId: 'qr-barcode', action: 'Generate QR code' },
  { patterns: [/shorten\s*(a\s+)?url/i, /url\s+shorten/i, /tiny\s+url/i, /short\s+link/i], toolId: 'url-shortener', action: 'Shorten URL' },
  { patterns: [/what\s+time\s+is\s+it\s+in/i, /timezone\s+convert/i, /world\s+clock/i, /time\s+in\s+\w+/i], toolId: 'world-clock', action: 'World clock' },
  { patterns: [/calculate\s*(my\s+)?age/i, /how\s+old\s+am\s+i/i, /age\s+from\s+birthday/i], toolId: 'age-calculator', action: 'Calculate age' },
  { patterns: [/days?\s+between/i, /date\s+difference/i, /how\s+many\s+days\s+(until|since|between)/i], toolId: 'date-calculator', action: 'Calculate date difference' },
  { patterns: [/percentage\s+calculat/i, /what\s+percent/i, /percent\s+of/i], toolId: 'percentage-calculator', action: 'Calculate percentage' },
  { patterns: [/bmi\s+calculat/i, /body\s+mass/i], toolId: 'bmi-calculator', action: 'Calculate BMI' },
  { patterns: [/ip\s+(address\s+)?lookup/i, /my\s+ip/i, /what\s+is\s+my\s+ip/i, /ip\s+geolocation/i], toolId: 'ip-lookup', action: 'Look up IP' },
  { patterns: [/typing\s+(speed|test)/i, /wpm\s+test/i, /how\s+fast\s+do\s+i\s+type/i], toolId: 'typing-speed', action: 'Test typing speed' },
  { patterns: [/unit\s+convert/i, /convert\s+miles\s+to/i, /convert\s+kg\s+to/i, /fahrenheit\s+to\s+celsius/i], toolId: 'unit-converter', action: 'Convert units' },

  // ── Student ─────────────────────────────────────────────────────────
  { patterns: [/generate\s*(a\s+)?citation/i, /cite\s+this/i, /apa\s+citation/i, /mla\s+citation/i, /bibliography/i], toolId: 'citation-generator', action: 'Generate citation' },
  { patterns: [/gpa\s+calculat/i, /calculate\s+gpa/i, /grade\s+point/i], toolId: 'gpa-calculator', action: 'Calculate GPA' },
  { patterns: [/latex/i, /render\s+math/i, /math\s+equation/i, /formula\s+render/i], toolId: 'latex-renderer', action: 'Render LaTeX' },
  { patterns: [/pomodoro/i, /study\s+timer/i, /focus\s+timer/i], toolId: 'study-timer', action: 'Start study timer' },
  { patterns: [/flashcard/i, /study\s+cards/i, /quiz\s+cards/i], toolId: 'flashcards', action: 'Create flashcards' },
  { patterns: [/solve\s+(math|equation|algebra|calculus)/i, /step\s+by\s+step\s+math/i, /derivative/i, /integral/i], toolId: 'math-solver', action: 'Solve math' },
  { patterns: [/essay\s+outline/i, /outline\s+for\s+(my\s+)?essay/i, /structure\s+(my\s+)?essay/i], toolId: 'essay-outline', action: 'Generate essay outline' },
  { patterns: [/graph\s+(a\s+)?function/i, /plot\s+(a\s+)?function/i, /graphing\s+calculator/i], toolId: 'graphing-calculator', action: 'Graph a function' },

  // ── SEO ─────────────────────────────────────────────────────────────
  { patterns: [/seo\s+analy/i, /check\s+(my\s+)?seo/i, /analyze\s+(my\s+)?website/i], toolId: 'seo-analyzer', action: 'Analyze SEO' },
  { patterns: [/generate\s+meta\s+tags/i, /meta\s+tag/i, /og\s+tags/i, /open\s+graph/i], toolId: 'meta-tag-generator', action: 'Generate meta tags' },
  { patterns: [/generate\s+sitemap/i, /xml\s+sitemap/i, /create\s+sitemap/i], toolId: 'sitemap-generator', action: 'Generate sitemap' },
  { patterns: [/robots\.?txt/i, /create\s+robots/i], toolId: 'robots-txt-generator', action: 'Generate robots.txt' },
  { patterns: [/keyword\s+density/i, /keyword\s+frequency/i, /keyword\s+analy/i], toolId: 'keyword-density', action: 'Check keyword density' },
  { patterns: [/page\s+speed/i, /lighthouse/i, /core\s+web\s+vitals/i, /website\s+speed/i], toolId: 'page-speed', action: 'Check page speed' },

  // ── Design ──────────────────────────────────────────────────────────
  { patterns: [/color\s+palette/i, /generate\s+colors/i, /contrast\s+check/i, /wcag\s+contrast/i, /color\s+picker/i], toolId: 'color-tools', action: 'Color tools' },
  { patterns: [/make\s*(a\s+)?meme/i, /meme\s+generator/i, /create\s+meme/i], toolId: 'meme-generator', action: 'Create meme' },
  { patterns: [/generate\s*(a\s+)?favicon/i, /create\s+favicon/i, /favicon\s+from/i], toolId: 'favicon-generator', action: 'Generate favicon' },
  { patterns: [/color\s*blind/i, /simulate\s+color/i, /deuteranopia/i, /protanopia/i], toolId: 'color-blindness', action: 'Simulate color blindness' },

  // ── Media ───────────────────────────────────────────────────────────
  { patterns: [/convert\s*(my\s+)?audio/i, /mp3\s+to\s+wav/i, /wav\s+to\s+mp3/i, /audio\s+format/i], toolId: 'audio-convert', action: 'Convert audio' },
  { patterns: [/convert\s*(my\s+)?video/i, /mp4\s+to\s+webm/i, /video\s+format/i], toolId: 'video-convert', action: 'Convert video' },
  { patterns: [/make\s*(a\s+)?gif/i, /create\s+gif/i, /gif\s+from/i], toolId: 'gif-maker', action: 'Create GIF' },
  { patterns: [/video\s+to\s+gif/i, /clip\s+to\s+gif/i], toolId: 'video-to-gif', action: 'Video → GIF' },
  { patterns: [/trim\s+audio/i, /cut\s+audio/i, /audio\s+trim/i, /clip\s+audio/i], toolId: 'audio-trimmer', action: 'Trim audio' },
  { patterns: [/compress\s+video/i, /make\s+video\s+smaller/i, /reduce\s+video\s+size/i], toolId: 'video-compressor', action: 'Compress video' },

  // ── Encoding / Fun ──────────────────────────────────────────────────
  { patterns: [/morse\s+code/i, /convert\s+to\s+morse/i, /sos/i], toolId: 'morse-code', action: 'Morse code' },
  { patterns: [/braille/i, /convert\s+to\s+braille/i], toolId: 'braille-converter', action: 'Convert to Braille' },
  { patterns: [/ascii\s+art/i, /text\s+to\s+ascii/i, /figlet/i, /text\s+banner/i], toolId: 'ascii-art', action: 'Generate ASCII art' },
  { patterns: [/emoji\s+(search|find|pick)/i, /find\s+emoji/i, /copy\s+emoji/i], toolId: 'emoji-picker', action: 'Find emoji' },
  { patterns: [/roman\s+numeral/i, /convert\s+to\s+roman/i], toolId: 'roman-numeral', action: 'Convert Roman numerals' },
  { patterns: [/nato\s+alphabet/i, /phonetic\s+alphabet/i, /alpha\s+bravo/i], toolId: 'nato-alphabet', action: 'NATO alphabet' },

  // ── AI ──────────────────────────────────────────────────────────────
  { patterns: [/ai\s+detect/i, /is\s+this\s+ai/i, /ai\s+generated/i, /chatgpt\s+detect/i, /written\s+by\s+ai/i], toolId: 'ai-detector', action: 'Detect AI content' },
  { patterns: [/sentiment\s+analy/i, /is\s+this\s+(positive|negative)/i, /tone\s+analy/i], toolId: 'sentiment-analysis', action: 'Analyze sentiment' },

  // ── Document editors ────────────────────────────────────────────────
  { patterns: [/edit\s*(a\s+)?word\s+doc/i, /online\s+word/i, /create\s+document/i, /write\s+document/i, /open\s+docx/i], toolId: 'word-editor', action: 'Edit Word document' },
  { patterns: [/markdown\s+editor/i, /write\s+markdown/i, /edit\s+markdown/i, /md\s+editor/i], toolId: 'markdown-editor', action: 'Edit Markdown' },
  { patterns: [/writing\s+template/i, /email\s+template/i, /resume\s+template/i, /cover\s+letter\s+template/i], toolId: 'writing-templates', action: 'Writing templates' },
];


/**
 * Match a natural-language query against intent patterns.
 * Returns an array of { toolId, action, score } sorted by relevance.
 * Score 2 = intent match, Score 1 = keyword fallback.
 */
export function matchIntent(query, tools) {
  if (!query || !query.trim()) return [];
  const q = query.trim();

  // Phase 1: intent pattern matching (highest priority)
  const intentMatches = [];
  for (const intent of INTENTS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(q)) {
        intentMatches.push({ toolId: intent.toolId, action: intent.action, score: 2 });
        break;
      }
    }
  }

  // Phase 2: keyword fallback (standard search)
  const lower = q.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 1);
  const keywordMatches = [];

  for (const tool of tools) {
    const matchedIntentIds = intentMatches.map((m) => m.toolId);
    if (matchedIntentIds.includes(tool.id)) continue; // already matched by intent

    const haystack = `${tool.name} ${tool.description} ${tool.keywords.join(' ')}`.toLowerCase();
    const matchCount = words.filter((w) => haystack.includes(w)).length;
    if (matchCount > 0) {
      keywordMatches.push({
        toolId: tool.id,
        action: tool.name,
        score: matchCount / words.length, // 0–1 range
      });
    }
  }

  // Sort keyword matches by score descending
  keywordMatches.sort((a, b) => b.score - a.score);

  return [...intentMatches, ...keywordMatches];
}

export default INTENTS;
