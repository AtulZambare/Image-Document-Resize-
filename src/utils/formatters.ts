export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function formatKBValue(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function calculateReductionPercent(originalBytes: number, finalBytes: number): number {
  if (originalBytes <= 0) return 0;
  return ((originalBytes - finalBytes) / originalBytes) * 100;
}

export function buildMeaningfulFilename(
  originalName: string,
  finalSizeBytes: number,
  targetExtension: string
): string {
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const cleanBase = baseName
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 48) || 'file';
  const kbTag = Math.max(1, Math.round(finalSizeBytes / 1024));
  const cleanExt = targetExtension.replace(/^\./, '').toLowerCase();
  return `${cleanBase}_resized_${kbTag}kb.${cleanExt}`;
}

export function sanitizeSvgContent(rawSvg: string): { safeSvg: string; hadUnsafeContent: boolean } {
  const unsafePattern = /<script[\s\S]*?>[\s\S]*?<\/script>|javascript:|on\w+\s*=/i;
  const hadUnsafeContent = unsafePattern.test(rawSvg);

  // Strip scripts, foreignObject, and inline event handlers
  let cleaned = rawSvg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, '');

  // Strip XML comments & editor metadata for clean compression
  cleaned = cleaned
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata[\s\S]*?>[\s\S]*?<\/metadata>/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();

  return { safeSvg: cleaned, hadUnsafeContent };
}
