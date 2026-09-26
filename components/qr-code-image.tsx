"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";

export function QrCodeImage({
  value,
  size = 180,
  alt = "PassFlow QR code",
}: {
  value: string;
  size?: number;
  alt?: string;
}) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (active) setSrc(url);
    }).catch(() => undefined);

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) {
    return <div className="grid place-items-center rounded-md bg-muted" style={{ width: size, height: size }}>Generating QR...</div>;
  }

  return <Image src={src} width={size} height={size} alt={alt} unoptimized className="rounded-md bg-white p-2" />;
}
