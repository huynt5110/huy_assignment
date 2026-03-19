/**
 * Simple Base64 encoding/decoding for cursor obfuscation.
 * This is widely used to create "opaque" cursors.
 */

export const encodeCursor = (value: string): string => {
  return Buffer.from(value).toString('base64');
};

export const decodeCursor = (encoded: string): string => {
  return Buffer.from(encoded, 'base64').toString('ascii');
};
