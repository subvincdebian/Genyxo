"use client";
import { useState } from "react";
import styles from "./Avatar.module.css";
export type AvatarProps = {
  name: string;
  src?: string;
  size?: number;
  className?: string;
};
/** Decorative identity image; the owning control supplies its accessible name. */
export function Avatar({ name, src, size = 36, className = "" }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span
      className={`${styles.avatar} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src && failed !== src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          onError={() => setFailed(src)}
        />
      ) : (
        <span>{name.slice(0, 1).toLocaleUpperCase()}</span>
      )}
    </span>
  );
}
