/**
 * Image Generation Service
 * Generates images from text prompts using AI models (DALL-E, Stable Diffusion)
 */

import { OpenAI } from 'openai';
import { logger } from '~/server/utils/logger';

export interface ImageGenerationOptions {
  model?: 'dall-e-3' | 'dall-e-2';
  size?: '1024x1024' | '1792x1024' | '1024x1792' | '256x256' | '512x512';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number; // Number of images (DALL-E 2 supports 1-10, DALL-E 3 only supports 1)
}

export interface GeneratedImage {
  id: string;
  url?: string; // Hosted URL from OpenAI (expires after 1 hour)
  b64_json?: string; // Base64 encoded image data
  revisedPrompt?: string; // DALL-E 3 may revise prompts
  model: string;
  parameters: ImageGenerationOptions;
  cost: number;
  createdAt: Date;
}

export interface GenerationProgress {
  status: 'queued' | 'generating' | 'complete' | 'failed';
  progress: number; // 0.0 - 1.0
  message?: string;
  error?: string;
}

export class ImageGenerationService {
  private openai: OpenAI;
  private defaultModel: 'dall-e-3' | 'dall-e-2';

  constructor(apiKey?: string, defaultModel: 'dall-e-3' | 'dall-e-2' = 'dall-e-3') {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    this.defaultModel = defaultModel;
  }

  /**
   * Generate image from text prompt
   */
  async generateImage(
    prompt: string,
    options: ImageGenerationOptions = {}
  ): Promise<GeneratedImage> {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();

    // Validate options for model
    const validatedOptions = this.validateOptions(model, options);

    logger.info('Starting image generation', {
      model,
      prompt: prompt.substring(0, 100),
      options: validatedOptions,
    });

    try {
      const response = await this.openai.images.generate({
        model,
        prompt,
        size: validatedOptions.size,
        quality: validatedOptions.quality,
        style: validatedOptions.style,
        n: validatedOptions.n,
        response_format: 'url', // Can be 'url' or 'b64_json'
      });

      const imageData = response.data[0];
      if (!imageData) {
        throw new Error('No image data returned from API');
      }

      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost(model, validatedOptions);

      logger.info('Image generation completed', {
        model,
        processingTime,
        cost,
        hasRevisedPrompt: !!imageData.revised_prompt,
      });

      return {
        id: `img_${Date.now()}`,
        url: imageData.url,
        b64_json: imageData.b64_json,
        revisedPrompt: imageData.revised_prompt,
        model,
        parameters: validatedOptions,
        cost,
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error('Image generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
        prompt: prompt.substring(0, 100),
      });
      throw new Error(
        `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate image with streaming progress updates
   * Note: OpenAI API doesn't support true streaming for image generation,
   * so this simulates progress based on typical generation times
   */
  async generateImageStream(
    prompt: string,
    options: ImageGenerationOptions,
    onProgress: (progress: GenerationProgress) => void
  ): Promise<GeneratedImage> {
    const model = options.model || this.defaultModel;

    // Emit initial progress
    onProgress({
      status: 'queued',
      progress: 0,
      message: 'Queuing image generation...',
    });

    // Simulate queuing delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    onProgress({
      status: 'generating',
      progress: 0.3,
      message: `Generating image with ${model}...`,
    });

    try {
      // Start actual generation
      const imagePromise = this.generateImage(prompt, options);

      // Simulate progress updates while generating
      const progressInterval = setInterval(() => {
        onProgress({
          status: 'generating',
          progress: 0.3 + Math.random() * 0.5, // 0.3 - 0.8
          message: 'Processing...',
        });
      }, 2000);

      const result = await imagePromise;

      clearInterval(progressInterval);

      onProgress({
        status: 'complete',
        progress: 1.0,
        message: 'Image generation complete!',
      });

      return result;
    } catch (error) {
      onProgress({
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create variations of an existing image (DALL-E 2 only)
   */
  async createVariation(
    imageBuffer: Buffer,
    n: number = 1,
    size: '256x256' | '512x512' | '1024x1024' = '1024x1024'
  ): Promise<GeneratedImage[]> {
    logger.info('Creating image variations', { n, size });

    try {
      // Convert buffer to File object
      const file = new File([imageBuffer], 'image.png', { type: 'image/png' });

      const response = await this.openai.images.createVariation({
        image: file,
        n,
        size,
      });

      const cost = this.calculateCost('dall-e-2', { size, n });

      return response.data.map((img, index) => ({
        id: `var_${Date.now()}_${index}`,
        url: img.url,
        b64_json: img.b64_json,
        model: 'dall-e-2',
        parameters: { model: 'dall-e-2', size, n: 1 },
        cost: cost / n,
        createdAt: new Date(),
      }));
    } catch (error) {
      logger.error('Image variation creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Edit image with mask and prompt (DALL-E 2 only)
   */
  async editImage(
    imageBuffer: Buffer,
    maskBuffer: Buffer,
    prompt: string,
    n: number = 1,
    size: '256x256' | '512x512' | '1024x1024' = '1024x1024'
  ): Promise<GeneratedImage[]> {
    logger.info('Editing image', { prompt: prompt.substring(0, 50), n, size });

    try {
      const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });
      const maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' });

      const response = await this.openai.images.edit({
        image: imageFile,
        mask: maskFile,
        prompt,
        n,
        size,
      });

      const cost = this.calculateCost('dall-e-2', { size, n });

      return response.data.map((img, index) => ({
        id: `edit_${Date.now()}_${index}`,
        url: img.url,
        b64_json: img.b64_json,
        model: 'dall-e-2',
        parameters: { model: 'dall-e-2', size, n: 1 },
        cost: cost / n,
        createdAt: new Date(),
      }));
    } catch (error) {
      logger.error('Image editing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Validate and normalize options for the selected model
   */
  private validateOptions(
    model: 'dall-e-3' | 'dall-e-2',
    options: ImageGenerationOptions
  ): Required<ImageGenerationOptions> {
    if (model === 'dall-e-3') {
      return {
        model: 'dall-e-3',
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        style: options.style || 'vivid',
        n: 1, // DALL-E 3 only supports n=1
      };
    } else {
      // DALL-E 2
      const validSizes: Array<'256x256' | '512x512' | '1024x1024'> = [
        '256x256',
        '512x512',
        '1024x1024',
      ];
      const size = validSizes.includes(options.size as any)
        ? (options.size as '256x256' | '512x512' | '1024x1024')
        : '1024x1024';

      return {
        model: 'dall-e-2',
        size,
        quality: 'standard', // DALL-E 2 doesn't have quality option
        style: 'natural', // DALL-E 2 doesn't have style option
        n: Math.min(options.n || 1, 10), // DALL-E 2 supports 1-10
      };
    }
  }

  /**
   * Calculate cost for image generation
   * Pricing as of 2024:
   * DALL-E 3:
   *   - Standard 1024×1024: $0.040
   *   - HD 1024×1024: $0.080
   *   - Standard 1792×1024 or 1024×1792: $0.080
   *   - HD 1792×1024 or 1024×1792: $0.120
   * DALL-E 2:
   *   - 1024×1024: $0.020
   *   - 512×512: $0.018
   *   - 256×256: $0.016
   */
  private calculateCost(model: string, options: Required<ImageGenerationOptions>): number {
    const { size, quality, n } = options;

    let costPerImage = 0;

    if (model === 'dall-e-3') {
      if (size === '1024x1024') {
        costPerImage = quality === 'hd' ? 0.08 : 0.04;
      } else {
        // 1792×1024 or 1024×1792
        costPerImage = quality === 'hd' ? 0.12 : 0.08;
      }
    } else if (model === 'dall-e-2') {
      switch (size) {
        case '1024x1024':
          costPerImage = 0.02;
          break;
        case '512x512':
          costPerImage = 0.018;
          break;
        case '256x256':
          costPerImage = 0.016;
          break;
        default:
          costPerImage = 0.02;
      }
    }

    return costPerImage * n;
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!this.openai && !!process.env.OPENAI_API_KEY;
  }
}
