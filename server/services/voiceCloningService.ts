import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

interface ElevenLabsVoiceSettings {
  stability: number; // 0.0-1.0
  similarityBoost: number; // 0.0-1.0
  style?: number; // 0.0-1.0
  useSpeakerBoost?: boolean;
}

interface VoiceCloneOptions {
  name: string;
  description?: string;
  audioFiles: Buffer[]; // Audio samples (WAV, MP3, etc.)
  removeBackgroundNoise?: boolean;
}

interface GenerateSpeechOptions {
  text: string;
  voiceId: string;
  modelId?: string; // Default: eleven_multilingual_v2
  voiceSettings?: ElevenLabsVoiceSettings;
  optimizeStreamingLatency?: number; // 0-4, higher = lower latency
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  available_for_tiers?: string[];
  settings?: ElevenLabsVoiceSettings;
}

interface GenerateSpeechResponse {
  audioBuffer: Buffer;
  contentType: string;
}

export class VoiceCloningService {
  private apiKey: string | null;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || null;
  }

  /**
   * Check if ElevenLabs API is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey !== '';
  }

  /**
   * Clone a voice using Instant Voice Cloning (IVC)
   * Requires: 1+ minute of clean audio samples
   */
  async cloneVoice(options: VoiceCloneOptions): Promise<ElevenLabsVoice> {
    if (!this.isConfigured()) {
      throw new Error('ElevenLabs API key not configured');
    }

    const formData = new FormData();
    formData.append('name', options.name);
    
    if (options.description) {
      formData.append('description', options.description);
    }

    // Add audio files
    options.audioFiles.forEach((buffer, index) => {
      formData.append('files', buffer, {
        filename: `sample_${index}.mp3`,
        contentType: 'audio/mpeg',
      });
    });

    // Background noise removal (optional, default: false)
    if (options.removeBackgroundNoise) {
      formData.append('remove_background_noise', 'true');
    }

    try {
      const response = await axios.post<ElevenLabsVoice>(
        `${this.baseUrl}/voices/add`,
        formData,
        {
          headers: {
            'xi-api-key': this.apiKey!,
            ...formData.getHeaders(),
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `ElevenLabs API error: ${error.response.data?.detail || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  /**
   * Generate speech from text using a cloned voice
   * Returns audio buffer and content type
   */
  async generateSpeech(options: GenerateSpeechOptions): Promise<GenerateSpeechResponse> {
    if (!this.isConfigured()) {
      throw new Error('ElevenLabs API key not configured');
    }

    const modelId = options.modelId || 'eleven_multilingual_v2';
    const voiceSettings = options.voiceSettings || {
      stability: 0.75,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true,
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${options.voiceId}`,
        {
          text: options.text,
          model_id: modelId,
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarityBoost,
            style: voiceSettings.style || 0.0,
            use_speaker_boost: voiceSettings.useSpeakerBoost ?? true,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey!,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          responseType: 'arraybuffer',
        }
      );

      return {
        audioBuffer: Buffer.from(response.data),
        contentType: response.headers['content-type'] || 'audio/mpeg',
      };
    } catch (error: any) {
      if (error.response) {
        const errorText = Buffer.from(error.response.data).toString();
        let errorMessage = 'ElevenLabs API error';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      throw error;
    }
  }

  /**
   * Generate speech as a stream for real-time playback
   * Lower latency for interactive use cases
   */
  async generateSpeechStream(options: GenerateSpeechOptions): Promise<Readable> {
    if (!this.isConfigured()) {
      throw new Error('ElevenLabs API key not configured');
    }

    const modelId = options.modelId || 'eleven_multilingual_v2';
    const voiceSettings = options.voiceSettings || {
      stability: 0.75,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true,
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${options.voiceId}/stream`,
        {
          text: options.text,
          model_id: modelId,
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarityBoost,
            style: voiceSettings.style || 0.0,
            use_speaker_boost: voiceSettings.useSpeakerBoost ?? true,
          },
          optimize_streaming_latency: options.optimizeStreamingLatency || 0,
        },
        {
          headers: {
            'xi-api-key': this.apiKey!,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          responseType: 'stream',
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `ElevenLabs streaming error: ${error.response.data?.detail || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  /**
   * Get all voices (including cloned ones)
   */
  async getAllVoices(): Promise<ElevenLabsVoice[]> {
    if (!this.isConfigured()) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.get<{ voices: ElevenLabsVoice[] }>(
        `${this.baseUrl}/voices`,
        {
          headers: {
            'xi-api-key': this.apiKey!,
          },
        }
      );

      return response.data.voices;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `ElevenLabs API error: ${error.response.data?.detail || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  /**
   * Get voice by ID
   */
  async getVoice(voiceId: string): Promise<ElevenLabsVoice> {
    if (!this.isConfigured()) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.get<ElevenLabsVoice>(
        `${this.baseUrl}/voices/${voiceId}`,
        {
          headers: {
            'xi-api-key': this.apiKey!,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `ElevenLabs API error: ${error.response.data?.detail || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  /**
   * Delete a cloned voice
   */
  async deleteVoice(voiceId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      await axios.delete(
        `${this.baseUrl}/voices/${voiceId}`,
        {
          headers: {
            'xi-api-key': this.apiKey!,
          },
        }
      );
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `ElevenLabs API error: ${error.response.data?.detail || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  /**
   * Edit voice settings
   */
  async editVoiceSettings(
    voiceId: string,
    settings: Partial<ElevenLabsVoiceSettings>
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      await axios.post(
        `${this.baseUrl}/voices/${voiceId}/settings/edit`,
        settings,
        {
          headers: {
            'xi-api-key': this.apiKey!,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `ElevenLabs API error: ${error.response.data?.detail || error.response.statusText}`
        );
      }
      throw error;
    }
  }
}

export const voiceCloningService = new VoiceCloningService();
