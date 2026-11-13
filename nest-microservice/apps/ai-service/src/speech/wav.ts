/**
 * WAV helpers for the speech step (ADR 0039): providers may answer raw 16-bit PCM (`audio/l16`)
 * or a WAV file; we always store WAV and report its exact duration (scene timing follows it).
 */

export interface PcmFormat {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

/** A RIFF/WAVE header around little-endian PCM samples. */
export function pcmToWav(pcm: Buffer, format: PcmFormat): Buffer {
  const { sampleRate, channels, bitsPerSample } = format;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export function isWav(data: Buffer): boolean {
  return (
    data.length >= 12 &&
    data.toString('ascii', 0, 4) === 'RIFF' &&
    data.toString('ascii', 8, 12) === 'WAVE'
  );
}

/** Duration in ms from the `fmt ` and `data` chunks; null when it isn't a PCM WAV we can read. */
export function wavDurationMs(wav: Buffer): number | null {
  if (!isWav(wav)) return null;
  let offset = 12;
  let byteRate = 0;
  while (offset + 8 <= wav.length) {
    const id = wav.toString('ascii', offset, offset + 4);
    let size = wav.readUInt32LE(offset + 4);
    if (id === 'fmt ') byteRate = wav.readUInt32LE(offset + 16);
    if (id === 'data') {
      // Streaming encoders may write 0 or 0xFFFFFFFF: the data runs to the end of the file.
      if (size === 0 || size === 0xffffffff || offset + 8 + size > wav.length) {
        size = wav.length - offset - 8;
      }
      return byteRate ? Math.round((size / byteRate) * 1000) : null;
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}
