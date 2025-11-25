
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageResolution, ModelType, StylePreset } from "../types";

// Helper to ensure we have a key for Pro models
const ensureApiKey = async (model: string) => {
  if ((model === ModelType.PRO || model.includes('gemini-3-pro')) && window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }
};

const getClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const constructPrompt = (basePrompt: string, style: StylePreset, negativePrompt?: string): string => {
  let finalPrompt = basePrompt;
  
  if (style && style !== StylePreset.NONE) {
    finalPrompt = `${style} style: ${finalPrompt}`;
  }
  
  if (negativePrompt && negativePrompt.trim()) {
    finalPrompt = `${finalPrompt} --no ${negativePrompt.trim()}`;
  }
  
  return finalPrompt;
};

const handleApiError = async (error: any) => {
  console.error("Gemini API Error:", error);
  
  const isPermissionError = error.message?.includes("403") || error.message?.includes("PERMISSION_DENIED") || error.status === 403;
  const isNotFoundError = error.message?.includes("Requested entity was not found") || error.status === 404;
  
  if ((isPermissionError || isNotFoundError) && window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        throw new Error("Access denied. Please select a valid API key with access to this model and try again.");
      } catch (keyError) {
        throw new Error("Authentication failed. Please check your API key.");
      }
  }
  throw error;
};

export const generateImage = async (
  prompt: string,
  model: ModelType,
  aspectRatio: AspectRatio,
  style: StylePreset,
  negativePrompt?: string,
  seed?: number | null,
  resolution: ImageResolution = '1K',
  referenceImage?: string // New optional reference image
): Promise<string> => {
  await ensureApiKey(model);
  const ai = getClient();
  
  const finalPrompt = constructPrompt(prompt, style, negativePrompt);

  try {
    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio,
      },
      ...(seed !== null && seed !== undefined ? { seed: seed } : {}) 
    };

    if (model === ModelType.PRO) {
        config.imageConfig.imageSize = resolution;
    }

    // Construct parts
    const parts: any[] = [];
    
    // If reference image exists, add it first (Image-to-Image logic)
    if (referenceImage) {
        const base64Data = referenceImage.split(',')[1] || referenceImage;
        const mimeType = referenceImage.match(/data:([^;]+);/)?.[1] || 'image/png';
        parts.push({
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        });
        parts.push({ text: "Generate an image based on this reference: " + finalPrompt });
    } else {
        parts.push({ text: finalPrompt });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts,
      },
      config: config,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response.");
  } catch (error: any) {
    return handleApiError(error);
  }
};

export const editImage = async (
  base64Image: string,
  prompt: string,
  model: ModelType,
  style: StylePreset,
  negativePrompt?: string,
  resolution: ImageResolution = '1K',
  maskImage?: string
): Promise<string> => {
  await ensureApiKey(model);
  const ai = getClient();

  const finalPrompt = constructPrompt(prompt, style, negativePrompt);
  const base64Data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || 'image/png';

  const parts: any[] = [
    {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    }
  ];

  if (maskImage) {
    const maskBase64 = maskImage.split(',')[1] || maskImage;
    const maskMime = maskImage.match(/data:([^;]+);/)?.[1] || 'image/png';
    parts.push({
      inlineData: {
        data: maskBase64,
        mimeType: maskMime,
      }
    });
    parts.push({
        text: "Edit the area of the first image highlighted by the white pixels in the second mask image. " + finalPrompt
    });
  } else {
    parts.push({ text: finalPrompt });
  }

  try {
    const config: any = { imageConfig: {} };
    if (model === ModelType.PRO) {
       config.imageConfig.imageSize = resolution; 
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts,
      },
      config: config,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in response.");
  } catch (error: any) {
    return handleApiError(error);
  }
};

export const enhancePrompt = async (currentPrompt: string): Promise<string> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert prompt engineer for AI image generation. 
      Rewrite the following simple prompt to be highly detailed, descriptive, and artistic. 
      Do not add commentary. Return ONLY the enhanced prompt.
      
      Original Prompt: ${currentPrompt}`,
    });
    return response.text?.trim() || currentPrompt;
  } catch (e) {
    console.error("Enhance Prompt Error", e);
    return currentPrompt;
  }
};

export const describeImage = async (base64Image: string): Promise<string> => {
  const ai = getClient();
  const base64Data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || 'image/png';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: "Describe this image in detail. Focus on the subject, lighting, artistic style, and composition. Provide a description suitable for using as an image generation prompt. Return ONLY the description." }
        ]
      }
    });
    return response.text?.trim() || "Failed to describe image.";
  } catch (e) {
    console.error("Describe Image Error", e);
    throw e;
  }
};
