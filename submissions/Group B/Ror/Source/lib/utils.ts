export function decodeStreamMessage(stream: Uint8Array): string {
  return new TextDecoder().decode(stream);
}
