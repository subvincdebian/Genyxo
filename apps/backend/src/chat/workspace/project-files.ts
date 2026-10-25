import { BadRequestException } from "@nestjs/common";
import { inflateRawSync } from "zlib";

// Read only the document XML, using central-directory lengths (Word may use
// data descriptors). Never unpack paths, evaluate XML entities, or fetch URLs.
export function extractDocxText(bytes: Buffer): string {
  try {
    const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (end < 0 || end + 22 > bytes.length) throw new Error();
    let cursor = bytes.readUInt32LE(end + 16);
    const count = bytes.readUInt16LE(end + 10);
    if (count > 5000) throw new Error();
    for (let i = 0; i < count; i++) {
      if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error();
      const flags = bytes.readUInt16LE(cursor + 8);
      const method = bytes.readUInt16LE(cursor + 10);
      const size = bytes.readUInt32LE(cursor + 20);
      const expanded = bytes.readUInt32LE(cursor + 24);
      const length = bytes.readUInt16LE(cursor + 28);
      const extra = bytes.readUInt16LE(cursor + 30);
      const comment = bytes.readUInt16LE(cursor + 32);
      const local = bytes.readUInt32LE(cursor + 42);
      const name = bytes
        .subarray(cursor + 46, cursor + 46 + length)
        .toString("utf8");
      cursor += 46 + length + extra + comment;
      if (name !== "word/document.xml") continue;
      if (
        flags & 1 ||
        expanded > 1000000 ||
        size > 5000000 ||
        bytes.readUInt32LE(local) !== 0x04034b50
      )
        throw new Error();
      const start =
        local +
        30 +
        bytes.readUInt16LE(local + 26) +
        bytes.readUInt16LE(local + 28);
      if (start + size > bytes.length) throw new Error();
      const packed = bytes.subarray(start, start + size);
      const xml = (
        method === 0
          ? packed
          : method === 8
            ? inflateRawSync(packed, { maxOutputLength: 1000000 })
            : Buffer.alloc(0)
      ).toString("utf8");
      if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error();
      return xml
        .replace(/<w:(?:br|tab)\b[^>]*\/?\s*>/g, " ")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(
          /&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi,
          (_match, numeric: string, named: string) => {
            if (numeric) {
              const point = numeric.startsWith("x")
                ? parseInt(numeric.slice(1), 16)
                : Number(numeric);
              return point > 0 && point <= 0x10ffff
                ? String.fromCodePoint(point)
                : "";
            }
            return (
              (
                { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<
                  string,
                  string
                >
              )[named.toLowerCase()] || ""
            );
          },
        )
        .trim()
        .slice(0, 45000);
    }
  } catch {
    throw new BadRequestException(
      "The DOCX file is corrupt, encrypted, or too large to extract",
    );
  }
  throw new BadRequestException("The DOCX file has no document text");
}
