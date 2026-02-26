import { describe, it, expect } from 'vitest';
import {
  convertAudio,
  convertVideo,
  AUDIO_FORMATS,
  VIDEO_FORMATS,
  VALID_BITRATES,
  VALID_RESOLUTIONS,
} from './mediaService.js';

describe('mediaService', () => {
  describe('convertAudio — input validation', () => {
    it('throws ValidationError when inputPath is missing', async () => {
      await expect(convertAudio(null, 'mp3')).rejects.toThrow('Input file path is required');
    });

    it('throws ValidationError when inputPath is empty string', async () => {
      await expect(convertAudio('', 'mp3')).rejects.toThrow('Input file path is required');
    });

    it('throws ValidationError for unsupported target format', async () => {
      await expect(convertAudio('/tmp/test.wav', 'xyz')).rejects.toThrow('Unsupported audio format');
    });

    it('throws ValidationError when targetFormat is missing', async () => {
      await expect(convertAudio('/tmp/test.wav', null)).rejects.toThrow('Unsupported audio format');
    });

    it('throws ValidationError for invalid bitrate', async () => {
      await expect(
        convertAudio('/tmp/test.wav', 'mp3', { bitrate: '999k' })
      ).rejects.toThrow('Invalid bitrate');
    });

    it('throws ValidationError when input file does not exist', async () => {
      await expect(
        convertAudio('/tmp/nonexistent-file-abc123.wav', 'mp3')
      ).rejects.toThrow('Input file not found');
    });

    it('accepts all supported audio formats as target', () => {
      const formats = Object.keys(AUDIO_FORMATS);
      expect(formats).toEqual(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']);
    });

    it('accepts all valid bitrate values', () => {
      expect(VALID_BITRATES).toEqual(['64k', '96k', '128k', '192k', '256k', '320k']);
    });
  });

  describe('convertVideo — input validation', () => {
    it('throws ValidationError when inputPath is missing', async () => {
      await expect(convertVideo(null, 'mp4')).rejects.toThrow('Input file path is required');
    });

    it('throws ValidationError when inputPath is empty string', async () => {
      await expect(convertVideo('', 'mp4')).rejects.toThrow('Input file path is required');
    });

    it('throws ValidationError for unsupported target format', async () => {
      await expect(convertVideo('/tmp/test.mp4', 'xyz')).rejects.toThrow('Unsupported video format');
    });

    it('throws ValidationError when targetFormat is missing', async () => {
      await expect(convertVideo('/tmp/test.mp4', null)).rejects.toThrow('Unsupported video format');
    });

    it('throws ValidationError for invalid resolution', async () => {
      await expect(
        convertVideo('/tmp/test.mp4', 'webm', { resolution: '9999x9999' })
      ).rejects.toThrow('Invalid resolution');
    });

    it('throws ValidationError when input file does not exist', async () => {
      await expect(
        convertVideo('/tmp/nonexistent-file-abc123.mp4', 'webm')
      ).rejects.toThrow('Input file not found');
    });

    it('accepts all supported video formats as target', () => {
      const formats = Object.keys(VIDEO_FORMATS);
      expect(formats).toEqual(['mp4', 'webm', 'avi', 'mov', 'mkv']);
    });

    it('accepts all valid resolution values', () => {
      expect(VALID_RESOLUTIONS).toContain('1920x1080');
      expect(VALID_RESOLUTIONS).toContain('1280x720');
      expect(VALID_RESOLUTIONS).toContain('640x480');
    });
  });

  describe('AUDIO_FORMATS MIME types', () => {
    it('maps mp3 to audio/mpeg', () => {
      expect(AUDIO_FORMATS.mp3).toBe('audio/mpeg');
    });

    it('maps wav to audio/wav', () => {
      expect(AUDIO_FORMATS.wav).toBe('audio/wav');
    });

    it('maps m4a to audio/mp4', () => {
      expect(AUDIO_FORMATS.m4a).toBe('audio/mp4');
    });
  });

  describe('VIDEO_FORMATS MIME types', () => {
    it('maps mp4 to video/mp4', () => {
      expect(VIDEO_FORMATS.mp4).toBe('video/mp4');
    });

    it('maps webm to video/webm', () => {
      expect(VIDEO_FORMATS.webm).toBe('video/webm');
    });

    it('maps mkv to video/x-matroska', () => {
      expect(VIDEO_FORMATS.mkv).toBe('video/x-matroska');
    });
  });
});
