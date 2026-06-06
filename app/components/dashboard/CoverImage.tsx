"use client";

import React from "react";
import { apiClient } from "../../../lib/apiClient";

interface CoverImageProps {
  songId: string;
  className?: string;
  fallbackClass?: string;
}

export function CoverImage({
  songId,
  className,
  fallbackClass,
}: CoverImageProps) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let revoke: string | null = null;
    apiClient.fetchBlobUrl(`/songs/${songId}/cover`).then((url) => {
      if (url) {
        revoke = url;
        setSrc(url);
      } else {
        setFailed(true);
      }
    });
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [songId]);

  if (failed || !src) {
    return (
      <div
        className={
          fallbackClass || "text-[9px] text-indigo-500 font-bold uppercase"
        }
      >
        MP3
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={className || "w-full h-full object-cover"}
      onError={() => setFailed(true)}
    />
  );
}
