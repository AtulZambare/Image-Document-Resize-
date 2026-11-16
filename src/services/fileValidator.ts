import { FileCategory, ValidationErrorItem } from '../types/processor';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB safety cap

export interface ValidatedFile {
  file: File;
  category: FileCategory;
  originalFormat: string;
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

function startsWithBytes(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  const slice = bytes.slice(start, start + length);
  return String.fromCharCode(...slice);
}

export async function validateUploadedFile(
  file: File
): Promise<{ valid: true; data: ValidatedFile } | { valid: false; error: ValidationErrorItem }> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (file.size === 0) {
    return {
      valid: false,
      error: { id, fileName: file.name, reasonKey: 'empty_file' },
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: { id, fileName: file.name, reasonKey: 'file_too_large' },
    };
  }

  const ext = getExtension(file.name);
  const mime = file.type.toLowerCase();

  // Block dangerous extensions immediately
  const blockedExts = new Set(['exe', 'bat', 'cmd', 'sh', 'js', 'mjs', 'php', 'py', 'dll', 'msi', 'html', 'htm']);
  if (blockedExts.has(ext)) {
    return {
      valid: false,
      error: { id, fileName: file.name, reasonKey: 'unsafe_content' },
    };
  }

  const headerSlice = new Uint8Array(await file.slice(0, 512).arrayBuffer());

  // Check PDF
  if (ext === 'pdf' || mime === 'application/pdf') {
    const headerText = readAscii(headerSlice, 0, Math.min(headerSlice.length, 64));
    if (!headerText.includes('%PDF-')) {
      return {
        valid: false,
        error: { id, fileName: file.name, reasonKey: 'spoofed_signature' },
      };
    }
    return {
      valid: true,
      data: { file, category: 'pdf', originalFormat: 'PDF' },
    };
  }

  // Check JPEG / JPG
  if (ext === 'jpg' || ext === 'jpeg' || mime === 'image/jpeg' || mime === 'image/jpg') {
    if (!startsWithBytes(headerSlice, [0xff, 0xd8, 0xff])) {
      return {
        valid: false,
        error: { id, fileName: file.name, reasonKey: 'spoofed_signature' },
      };
    }
    return {
      valid: true,
      data: { file, category: 'image', originalFormat: 'JPG' },
    };
  }

  // Check PNG
  if (ext === 'png' || mime === 'image/png') {
    if (!startsWithBytes(headerSlice, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
      return {
        valid: false,
        error: { id, fileName: file.name, reasonKey: 'spoofed_signature' },
      };
    }
    return {
      valid: true,
      data: { file, category: 'image', originalFormat: 'PNG' },
    };
  }

  // Check WEBP (RIFF....WEBP)
  if (ext === 'webp' || mime === 'image/webp') {
    const riff = readAscii(headerSlice, 0, 4);
    const webp = readAscii(headerSlice, 8, 4);
    if (riff !== 'RIFF' || webp !== 'WEBP') {
      return {
        valid: false,
        error: { id, fileName: file.name, reasonKey: 'spoofed_signature' },
      };
    }
    return {
      valid: true,
      data: { file, category: 'image', originalFormat: 'WEBP' },
    };
  }

  // Check GIF
  if (ext === 'gif' || mime === 'image/gif') {
    const gifHeader = readAscii(headerSlice, 0, 6);
    if (gifHeader !== 'GIF87a' && gifHeader !== 'GIF89a') {
      return {
        valid: false,
        error: { id, fileName: file.name, reasonKey: 'spoofed_signature' },
      };
    }
    return {
      valid: true,
      data: { file, category: 'image', originalFormat: 'GIF' },
    };
  }

  // Check BMP
  if (ext === 'bmp' || mime === 'image/bmp') {
    if (!startsWithBytes(headerSlice, [0x42, 0x4d])) {
      return {
        valid: false,
        error: { id, fileName: file.name, reasonKey: 'spoofed_signature' },
      };
    }
    return {
      valid: true,
      data: { file, category: 'image', originalFormat: 'BMP' },
    };
  }

  // Check SVG
  if (ext === 'svg' || mime === 'image/svg+xml') {
    const textPreview = new TextDecoder('utf-8', { fatal: false }).decode(headerSlice);
    if (!textPreview.toLowerCase().includes('<svg') && !textPreview.toLowerCase().includes('<?xml')) {
      return {
        valid: false,
        error: { id, fileName: file.name, reasonKey: 'spoofed_signature' },
      };
    }
    const fullText = await file.text();
    if (/<script[\s>]/i.test(fullText)) {
      return {
        valid: false,
        error: { id, fileName: file.name, reasonKey: 'unsafe_content' },
      };
    }
    return {
      valid: true,
      data: { file, category: 'svg', originalFormat: 'SVG' },
    };
  }

  // Check plain text / markdown / csv practical documents
  if (ext === 'txt' || ext === 'md' || ext === 'csv' || mime === 'text/plain' || mime === 'text/csv') {
    return {
      valid: true,
      data: { file, category: 'text', originalFormat: ext.toUpperCase() || 'TXT' },
    };
  }

  return {
    valid: false,
    error: { id, fileName: file.name, reasonKey: 'unsupported_type' },
  };
}
