import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../../common/FileUpload';

/**
 * Parse a PDF's byte range signature dictionaries to extract signer info.
 * This is a client-side parser — it reads the raw PDF bytes to find /Sig
 * dictionaries and extract the PKCS#7 DER-encoded signer details.
 */

// ASN.1 tag constants
const ASN1_SEQUENCE = 0x30;
const ASN1_SET = 0x31;
const ASN1_OID = 0x06;
const ASN1_UTF8 = 0x0c;
const ASN1_PRINTABLE = 0x13;
const ASN1_IA5 = 0x16;
const ASN1_T61 = 0x14;
const ASN1_BMP = 0x1e;
const ASN1_UTC_TIME = 0x17;
const ASN1_GENERALIZED_TIME = 0x18;

// Common OIDs for X.509 distinguished name fields
const OID_MAP = {
  '2.5.4.3': 'Common Name',
  '2.5.4.6': 'Country',
  '2.5.4.7': 'Locality',
  '2.5.4.8': 'State',
  '2.5.4.10': 'Organization',
  '2.5.4.11': 'Org Unit',
  '1.2.840.113549.1.9.1': 'Email',
  '2.5.4.5': 'Serial Number',
  '2.5.4.12': 'Title',
  '2.5.4.42': 'Given Name',
  '2.5.4.4': 'Surname',
};

function readASN1Length(bytes, offset) {
  const first = bytes[offset];
  if (first < 0x80) return { length: first, bytesRead: 1 };
  const numBytes = first & 0x7f;
  let length = 0;
  for (let i = 0; i < numBytes; i++) {
    length = (length << 8) | bytes[offset + 1 + i];
  }
  return { length, bytesRead: 1 + numBytes };
}

function decodeOID(bytes, offset, length) {
  const parts = [];
  parts.push(Math.floor(bytes[offset] / 40));
  parts.push(bytes[offset] % 40);
  let value = 0;
  for (let i = 1; i < length; i++) {
    value = (value << 7) | (bytes[offset + i] & 0x7f);
    if (!(bytes[offset + i] & 0x80)) {
      parts.push(value);
      value = 0;
    }
  }
  return parts.join('.');
}

function decodeString(bytes, offset, length, tag) {
  if (tag === ASN1_BMP) {
    let str = '';
    for (let i = 0; i < length; i += 2) {
      str += String.fromCharCode((bytes[offset + i] << 8) | bytes[offset + i + 1]);
    }
    return str;
  }
  return new TextDecoder('utf-8').decode(bytes.slice(offset, offset + length));
}

function parseTime(bytes, offset, length, tag) {
  const str = new TextDecoder('ascii').decode(bytes.slice(offset, offset + length));
  if (tag === ASN1_UTC_TIME) {
    const y = parseInt(str.slice(0, 2));
    const year = y >= 50 ? 1900 + y : 2000 + y;
    return new Date(`${year}-${str.slice(2, 4)}-${str.slice(4, 6)}T${str.slice(6, 8)}:${str.slice(8, 10)}:${str.slice(10, 12)}Z`);
  }
  return new Date(`${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}T${str.slice(8, 10)}:${str.slice(10, 12)}:${str.slice(12, 14)}Z`);
}

/** Extract distinguished name fields from an ASN.1 Name sequence */
function parseDN(bytes, offset, endOffset) {
  const fields = {};
  let pos = offset;
  while (pos < endOffset) {
    if (bytes[pos] !== ASN1_SET) { pos++; continue; }
    pos++;
    const setLen = readASN1Length(bytes, pos);
    pos += setLen.bytesRead;
    const setEnd = pos + setLen.length;
    while (pos < setEnd) {
      if (bytes[pos] !== ASN1_SEQUENCE) { pos++; continue; }
      pos++;
      const seqLen = readASN1Length(bytes, pos);
      pos += seqLen.bytesRead;
      if (bytes[pos] === ASN1_OID) {
        pos++;
        const oidLen = readASN1Length(bytes, pos);
        pos += oidLen.bytesRead;
        const oid = decodeOID(bytes, pos, oidLen.length);
        pos += oidLen.length;
        const valTag = bytes[pos];
        pos++;
        const valLen = readASN1Length(bytes, pos);
        pos += valLen.bytesRead;
        const label = OID_MAP[oid] || oid;
        fields[label] = decodeString(bytes, pos, valLen.length, valTag);
        pos += valLen.length;
      }
    }
    pos = setEnd;
  }
  return fields;
}

/** Try to find certificates in a PKCS#7 SignedData structure and extract signer info */
function parsePKCS7(der) {
  const results = [];
  try {
    const bytes = new Uint8Array(der);
    // Walk through the DER looking for certificate sequences
    // A certificate starts with SEQUENCE > SEQUENCE > [0] EXPLICIT > INTEGER (version)
    // We look for issuer and subject distinguished names and validity dates
    
    const certs = [];
    // Find all certificate-like sequences by scanning for common patterns
    for (let i = 0; i < bytes.length - 10; i++) {
      // Look for UTC time or Generalized time (validity dates in certs)
      if (bytes[i] === ASN1_UTC_TIME || bytes[i] === ASN1_GENERALIZED_TIME) {
        const timeTag = bytes[i];
        i++;
        const timeLen = readASN1Length(bytes, i);
        i += timeLen.bytesRead;
        try {
          const date = parseTime(bytes, i, timeLen.length, timeTag);
          if (date && !isNaN(date.getTime())) {
            // Check if there's another time right after (notBefore + notAfter pair)
            const nextPos = i + timeLen.length;
            if (nextPos < bytes.length && (bytes[nextPos] === ASN1_UTC_TIME || bytes[nextPos] === ASN1_GENERALIZED_TIME)) {
              const tag2 = bytes[nextPos];
              const len2 = readASN1Length(bytes, nextPos + 1);
              const date2 = parseTime(bytes, nextPos + 1 + len2.bytesRead, len2.length, tag2);
              if (date2 && !isNaN(date2.getTime())) {
                certs.push({ notBefore: date, notAfter: date2, offset: i });
              }
            }
          }
        } catch { /* skip */ }
        i += timeLen.length - 1;
      }
    }

    // Now scan for distinguished names (subject/issuer) near each cert's validity dates
    // Look backwards from each validity date to find SET sequences (DN fields)
    for (const cert of certs) {
      // Scan a window before the validity dates for DN-like structures
      const searchStart = Math.max(0, cert.offset - 2000);
      const searchEnd = cert.offset;
      const dnFields = {};
      
      for (let j = searchStart; j < searchEnd - 4; j++) {
        if (bytes[j] === ASN1_SET) {
          const setLenInfo = readASN1Length(bytes, j + 1);
          const setEnd = j + 1 + setLenInfo.bytesRead + setLenInfo.length;
          if (setEnd <= searchEnd && setLenInfo.length > 4 && setLenInfo.length < 500) {
            try {
              const parsed = parseDN(bytes, j, setEnd);
              Object.assign(dnFields, parsed);
            } catch { /* skip */ }
          }
        }
      }

      if (Object.keys(dnFields).length > 0) {
        results.push({
          subject: dnFields,
          notBefore: cert.notBefore,
          notAfter: cert.notAfter,
        });
      }
    }
  } catch { /* parsing failed */ }
  return results;
}

/** Extract signature dictionaries from raw PDF bytes */
function extractSignatures(pdfBytes) {
  const text = new TextDecoder('latin1').decode(pdfBytes);
  const signatures = [];

  // Find all /Type /Sig dictionaries
  const sigRegex = /\/Type\s*\/Sig/g;
  let match;
  while ((match = sigRegex.exec(text)) !== null) {
    const sig = { raw: {} };
    // Search backwards and forwards for the dictionary bounds << ... >>
    const searchStart = Math.max(0, match.index - 2000);
    const searchEnd = Math.min(text.length, match.index + 5000);
    const chunk = text.slice(searchStart, searchEnd);

    // Extract /Name — PDF strings use balanced parens, handle nested ones
    const nameMatch = chunk.match(/\/Name\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)/);
    if (nameMatch) sig.raw.name = nameMatch[1].trim();

    // Extract /Reason
    const reasonMatch = chunk.match(/\/Reason\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)/);
    if (reasonMatch) sig.raw.reason = reasonMatch[1].trim();

    // Extract /Location
    const locMatch = chunk.match(/\/Location\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)/);
    if (locMatch) sig.raw.location = locMatch[1].trim();

    // Extract /M (signing date)
    const dateMatch = chunk.match(/\/M\s*\(D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (dateMatch) {
      const [, y, mo, d, h, mi, s] = dateMatch;
      sig.raw.date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
    }

    // Extract /Filter — stop at whitespace or /
    const filterMatch = chunk.match(/\/Filter\s*\/([A-Za-z0-9_.]+)/);
    if (filterMatch) sig.raw.filter = filterMatch[1];

    // Extract /SubFilter — stop at whitespace or /
    const subFilterMatch = chunk.match(/\/SubFilter\s*\/([A-Za-z0-9_.]+)/);
    if (subFilterMatch) sig.raw.subFilter = subFilterMatch[1];

    // Extract /ByteRange to get the PKCS#7 content
    const byteRangeMatch = chunk.match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
    if (byteRangeMatch) {
      const [, off1, len1, off2, len2] = byteRangeMatch.map(Number);
      sig.byteRange = { off1, len1, off2, len2 };
      // The signature content is between the two byte ranges
      const sigStart = off1 + len1;
      const sigEnd = off2;
      if (sigEnd > sigStart && sigEnd < pdfBytes.length) {
        // Extract hex-encoded PKCS#7 content (between < and >)
        const hexChunk = text.slice(sigStart, sigEnd);
        const hexClean = hexChunk.replace(/[^0-9a-fA-F]/g, '');
        if (hexClean.length > 20) {
          const derBytes = new Uint8Array(hexClean.length / 2);
          for (let i = 0; i < hexClean.length; i += 2) {
            derBytes[i / 2] = parseInt(hexClean.slice(i, i + 2), 16);
          }
          sig.pkcs7 = derBytes;
          sig.certInfo = parsePKCS7(derBytes);
        }
      }
    }

    // Check if the signature covers the entire document
    if (sig.byteRange) {
      const totalCovered = sig.byteRange.len1 + sig.byteRange.len2;
      const gapSize = sig.byteRange.off2 - (sig.byteRange.off1 + sig.byteRange.len1);
      sig.coversEntireDoc = (sig.byteRange.off1 === 0) && 
                            (sig.byteRange.off2 + sig.byteRange.len2 >= pdfBytes.length - 2);
      sig.totalCovered = totalCovered;
      sig.gapSize = gapSize;
    }

    signatures.push(sig);
  }

  // Deduplicate — same signer + same date + same byte range = same signature
  const seen = new Set();
  const unique = signatures.filter((sig) => {
    const key = [
      sig.raw.name || '',
      sig.raw.date?.getTime() || '',
      sig.byteRange ? `${sig.byteRange.off1}-${sig.byteRange.len1}-${sig.byteRange.off2}-${sig.byteRange.len2}` : '',
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}

export default function PDFSignatureVerifier() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [signatures, setSignatures] = useState(null);
  const [error, setError] = useState(null);
  const [fileSize, setFileSize] = useState(0);
  const [sigImages, setSigImages] = useState({}); // idx -> dataUrl

  const handleFileSelected = useCallback(async (files) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setFileSize(f.size);
    setLoading(true);
    setError(null);
    setSignatures(null);
    setSigImages({});

    try {
      const arrayBuffer = await f.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);
      const sigs = extractSignatures(pdfBytes);
      setSignatures(sigs);

      // Use pdf.js to render signature visual appearances
      const pdfjsLib = await import('pdfjs-dist');
      const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;

      const images = {};
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const annotations = await page.getAnnotations();
        const sigAnnotations = annotations.filter(
          (a) => a.subtype === 'Widget' && a.fieldType === 'Sig' && a.rect
        );

        if (sigAnnotations.length === 0) continue;

        // Render the page at 2x for quality
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Crop each signature annotation area
        for (const ann of sigAnnotations) {
          const [x1, y1, x2, y2] = ann.rect;
          // PDF coords are bottom-left origin, canvas is top-left
          const sx = x1 * 2;
          const sy = (page.getViewport({ scale: 1 }).height - y2) * 2;
          const sw = (x2 - x1) * 2;
          const sh = (y2 - y1) * 2;

          if (sw > 5 && sh > 5) {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = sw;
            cropCanvas.height = sh;
            const cropCtx = cropCanvas.getContext('2d');
            cropCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
            const dataUrl = cropCanvas.toDataURL('image/png');

            // Match to a signature by name or index
            const sigName = ann.fieldName || '';
            let matchIdx = sigs.findIndex((s) => s.raw.name && sigName.toLowerCase().includes(s.raw.name.toLowerCase()));
            if (matchIdx === -1) {
              // Assign to the next unmatched signature
              const usedIndices = new Set(Object.keys(images).map(Number));
              matchIdx = sigs.findIndex((_, i) => !usedIndices.has(i));
            }
            if (matchIdx >= 0) {
              images[matchIdx] = dataUrl;
            }
          }
        }
      }

      pdf.destroy();
      setSigImages(images);
    } catch (err) {
      setError('Failed to parse PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = () => {
    setFile(null);
    setSignatures(null);
    setError(null);
    setSigImages({});
  };

  const formatDate = (d) => {
    if (!d || isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  };

  const isExpired = (d) => d && !isNaN(d.getTime()) && d < new Date();
  const isNotYetValid = (d) => d && !isNaN(d.getTime()) && d > new Date();

  // Step 1: Upload
  if (!file) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-surface-100 mb-1">PDF Signature Verifier</h2>
          <p className="text-sm text-surface-500">Upload a digitally signed PDF to inspect its signatures, certificates, and signer details</p>
        </div>
        <FileUpload onFilesSelected={handleFileSelected} accept=".pdf,application/pdf" multiple={false} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[['🔍', 'Extract signatures'], ['📜', 'View certificates'], ['👤', 'Signer details'], ['⏰', 'Check validity']].map(([icon, label]) => (
            <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xl">{icon}</span>
              <span className="text-xs text-surface-500">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-center" style={{ color: 'var(--tp-muted)' }}>
          100% client-side — your PDF never leaves your browser
        </p>
      </motion.div>
    );
  }

  // Step 2: Results
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* File info */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'var(--tp-card)', border: '1px solid var(--tp-border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg">📄</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-surface-200 truncate">{file.name}</p>
            <p className="text-xs text-surface-500">{(fileSize / 1024).toFixed(1)} KB</p>
          </div>
        </div>
        <button onClick={reset} className="text-xs text-surface-500 hover:text-red-400 transition-colors shrink-0 ml-2">✕ Close</button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <svg className="w-8 h-8 animate-spin" style={{ color: 'var(--tp-accent)' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-surface-400">Analyzing signatures...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {signatures && !loading && (
        <>
          {/* Summary card */}
          <div className="p-5 rounded-2xl" style={{ background: 'var(--tp-card)', border: '1px solid var(--tp-border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{
                background: signatures.length > 0 ? 'rgba(48,209,88,0.15)' : 'rgba(255,159,67,0.15)',
              }}>
                {signatures.length > 0 ? '✅' : '⚠️'}
              </div>
              <div>
                <h3 className="text-base font-bold text-surface-100">
                  {signatures.length > 0
                    ? `${signatures.length} Digital Signature${signatures.length > 1 ? 's' : ''} Found`
                    : 'No Digital Signatures Found'}
                </h3>
                <p className="text-xs text-surface-500">
                  {signatures.length > 0
                    ? 'This PDF contains embedded digital signatures'
                    : 'This PDF does not contain any digital signatures'}
                </p>
              </div>
            </div>

            {signatures.length === 0 && (
              <div className="p-4 rounded-xl text-sm text-surface-400" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="mb-2">This could mean:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>The PDF was never digitally signed</li>
                  <li>The PDF uses a visual-only signature (image stamp) without cryptographic signing</li>
                  <li>The signature format is not standard PKCS#7/CMS</li>
                </ul>
              </div>
            )}
          </div>

          {/* Individual signatures */}
          <AnimatePresence>
            {signatures.map((sig, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--tp-border)' }}
              >
                {/* Signature header */}
                <div className="px-5 py-4 flex items-center gap-3" style={{ background: 'var(--tp-card)' }}>
                  <span className="text-lg">🖊️</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-surface-100">
                      Signature {idx + 1}{sig.raw.name ? ` — ${sig.raw.name}` : ''}
                    </h4>
                    {sig.raw.date && (
                      <p className="text-xs text-surface-500">Signed: {formatDate(sig.raw.date)}</p>
                    )}
                  </div>
                  {sig.coversEntireDoc !== undefined && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      sig.coversEntireDoc
                        ? 'text-green-400 bg-green-400/10'
                        : 'text-amber-400 bg-amber-400/10'
                    }`}>
                      {sig.coversEntireDoc ? 'Covers entire document' : 'Partial coverage'}
                    </span>
                  )}
                </div>

                {/* Signature details */}
                <div className="px-5 py-4 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>

                  {/* Signature visual appearance */}
                  {sigImages[idx] && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Signature Appearance</h5>
                      <div className="p-4 rounded-xl flex flex-col items-center gap-4" style={{ background: 'var(--tp-card)', border: '1px solid var(--tp-border)' }}>
                        <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--tp-border)', background: '#fff' }}>
                          <img
                            src={sigImages[idx]}
                            alt={`Signature by ${sig.raw.name || 'Unknown'}`}
                            className="max-w-full max-h-48 object-contain"
                          />
                        </div>
                        <a
                          href={sigImages[idx]}
                          download={`signature-${sig.raw.name || idx + 1}.png`}
                          className="btn-primary text-xs px-4 py-2 flex items-center gap-2"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download Signature Image
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {sig.raw.filter && (
                      <DetailItem label="Filter" value={sig.raw.filter} />
                    )}
                    {sig.raw.subFilter && (
                      <DetailItem label="Sub-Filter" value={sig.raw.subFilter} />
                    )}
                    {sig.raw.reason && (
                      <DetailItem label="Reason" value={sig.raw.reason} />
                    )}
                    {sig.raw.location && (
                      <DetailItem label="Location" value={sig.raw.location} />
                    )}
                    {sig.byteRange && (
                      <DetailItem label="Signed Bytes" value={`${((sig.totalCovered) / 1024).toFixed(1)} KB of ${(fileSize / 1024).toFixed(1)} KB`} />
                    )}
                    {sig.pkcs7 && (
                      <DetailItem label="Signature Size" value={`${(sig.pkcs7.length / 1024).toFixed(1)} KB (PKCS#7)`} />
                    )}
                  </div>

                  {/* Certificate info */}
                  {sig.certInfo && sig.certInfo.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Certificates</h5>
                      {sig.certInfo.map((cert, ci) => (
                        <div key={ci} className="p-4 rounded-xl space-y-3" style={{ background: 'var(--tp-card)', border: '1px solid var(--tp-border)' }}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📜</span>
                            <span className="text-sm font-semibold text-surface-200">
                              {cert.subject['Common Name'] || cert.subject['Organization'] || `Certificate ${ci + 1}`}
                            </span>
                            {cert.notAfter && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto ${
                                isExpired(cert.notAfter)
                                  ? 'text-red-400 bg-red-400/10'
                                  : isNotYetValid(cert.notBefore)
                                    ? 'text-amber-400 bg-amber-400/10'
                                    : 'text-green-400 bg-green-400/10'
                              }`}>
                                {isExpired(cert.notAfter) ? 'Expired' : isNotYetValid(cert.notBefore) ? 'Not yet valid' : 'Valid'}
                              </span>
                            )}
                          </div>

                          {/* Subject fields */}
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(cert.subject).map(([key, val]) => (
                              <DetailItem key={key} label={key} value={val} small />
                            ))}
                          </div>

                          {/* Validity */}
                          {(cert.notBefore || cert.notAfter) && (
                            <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: '1px solid var(--tp-border)' }}>
                              {cert.notBefore && <DetailItem label="Valid From" value={formatDate(cert.notBefore)} small />}
                              {cert.notAfter && <DetailItem label="Valid Until" value={formatDate(cert.notAfter)} small />}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No cert info extracted */}
                  {sig.pkcs7 && (!sig.certInfo || sig.certInfo.length === 0) && (
                    <div className="p-3 rounded-xl text-xs text-surface-400" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      PKCS#7 signature data found ({(sig.pkcs7.length / 1024).toFixed(1)} KB) but certificate details could not be fully parsed.
                      The signature may use a non-standard encoding or advanced features.
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Disclaimer */}
          <div className="p-4 rounded-xl text-xs space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--tp-border)' }}>
            <p className="font-semibold text-surface-300">⚠️ Important Note</p>
            <p className="text-surface-500 leading-relaxed">
              This tool extracts and displays signature metadata from PDFs. It does not perform full cryptographic
              verification against a certificate authority (CA). For legally binding verification of government or
              notarized documents, use Adobe Acrobat Reader or your government's official verification portal.
            </p>
          </div>

          <button onClick={reset} className="btn-secondary w-full">Verify Another PDF</button>
        </>
      )}
    </motion.div>
  );
}

function DetailItem({ label, value, small }) {
  return (
    <div>
      <p className={`font-medium text-surface-500 ${small ? 'text-[10px]' : 'text-xs'}`}>{label}</p>
      <p className={`font-medium text-surface-200 ${small ? 'text-xs' : 'text-sm'} break-all`}>{value}</p>
    </div>
  );
}
