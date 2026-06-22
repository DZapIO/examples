import { useState } from "react";

type AvatarProps = {
  src?: string | null;
  alt: string;
  /** Text used for the monogram fallback (defaults to `alt`). */
  fallback?: string;
  size?: number;
};

/** Circular token/protocol image that falls back to a monogram on load error. */
const Avatar = ({ src, alt, fallback, size = 32 }: AvatarProps) => {
  const [errored, setErrored] = useState(false);
  const dimensions = { width: size, height: size };

  if (src && !errored) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setErrored(true)}
        style={dimensions}
        className="shrink-0 rounded-full bg-gray-100 object-cover"
      />
    );
  }

  return (
    <div
      style={dimensions}
      className="flex shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600"
    >
      {(fallback ?? alt).slice(0, 1).toUpperCase()}
    </div>
  );
};

export default Avatar;
