import QRCode from 'qrcode';

export type QrEntityType = 'cuartel' | 'lote' | 'orden' | 'guia';

export function buildQrDeepLink(type: QrEntityType, id: string): string {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://agricola-queni.local';
  const params = new URLSearchParams({ qr: `${type}:${id}` });
  return `${origin}/?${params.toString()}`;
}

export async function generateQrDataUrl(text: string, width = 320): Promise<string> {
  return QRCode.toDataURL(text, {
    width,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}
