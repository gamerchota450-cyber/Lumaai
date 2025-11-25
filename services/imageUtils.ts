
import { removeBackground } from "@imgly/background-removal";

export const processRemoveBackground = async (imageSrc: string): Promise<string> => {
  try {
    // Using jsdelivr for better CORS support and reliability
    const publicPath = "https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.5.5/dist/";

    const config = {
      publicPath: publicPath,
      progress: (key: string, current: number, total: number) => {
        // Optional: Log progress
        // console.debug(`BG Removal [${key}]: ${Math.round(current/total * 100)}%`);
      },
      debug: false
    };

    // Optimize: Convert base64/URL to Blob first. 
    // This often resolves issues where passing large base64 strings directly to the worker fails.
    let input: Blob;
    if (imageSrc.startsWith('data:')) {
        const res = await fetch(imageSrc);
        input = await res.blob();
    } else {
        const res = await fetch(imageSrc);
        input = await res.blob();
    }

    const blob = await removeBackground(input, config);

    // Convert result Blob back to Base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert processed image to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    console.error("Background Removal Error:", error);
    // Provide a more user-friendly error message if it's a fetch error
    if (error.message && error.message.includes('fetch')) {
        throw new Error("Failed to download AI models. Please check your internet connection or firewall.");
    }
    throw new Error(error.message || "Failed to remove background.");
  }
};
