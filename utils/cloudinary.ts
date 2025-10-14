import * as FileSystem from 'expo-file-system';

// Extend the global FormData interface to handle our use case
type FormDataValue = {
  uri: string;
  name: string;
  type: string;
};

declare global {
  interface FormData {
    append(name: string, value: string | Blob | FormDataValue, fileName?: string): void;
    set(name: string, value: string | Blob | FormDataValue, fileName?: string): void;
  }
}

// Helper function to create form data for file upload
const createFormData = (file: { uri: string; name: string; type: string }, body: Record<string, string> = {}): FormData => {
  const data = new FormData();
  
  // Add file data with proper type
  const fileData: FormDataValue = {
    uri: file.uri,
    name: file.name,
    type: file.type,
  };
  
  data.append('file', fileData);
  
  // Add additional form data
  Object.entries(body).forEach(([key, value]) => {
    data.append(key, value);
  });
  
  return data;
};

// Define types for Cloudinary configuration
type CloudinaryConfig = {
  CLOUDINARY_UPLOAD_PRESET: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_UPLOAD_URL: string;
};

// Type assertion for environment variables
declare const process: {
  env: {
    EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?: string;
    EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?: string;
  };
};

// Initialize configuration with environment variables
const config: CloudinaryConfig = {
  CLOUDINARY_UPLOAD_PRESET: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default',
  CLOUDINARY_CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dgtzqjfbd',
  CLOUDINARY_UPLOAD_URL: ''
};

// Set the upload URL after config is initialized
config.CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}/image/upload`;

export const uploadToCloudinary = async (uri: string) => {
  try {
    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Get the file type from the URI
    const fileType = uri.split('.').pop();
    const fileName = `event_${Date.now()}.${fileType}`;

    // Create a temporary file URI
    const tempUri = `${FileSystem.cacheDirectory}${fileName}`;
    
    // Write the base64 data to a temporary file
    await FileSystem.writeAsStringAsync(tempUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Create form data with the file and additional parameters
    const formData = createFormData(
      {
        uri: tempUri,
        name: fileName,
        type: `image/${fileType}`,
      },
      {
        upload_preset: config.CLOUDINARY_UPLOAD_PRESET,
        public_id: fileName,
        folder: 'campus_events',
      }
    );
    
    // Clean up the temporary file
    await FileSystem.deleteAsync(tempUri, { idempotent: true });

    // Upload to Cloudinary
    const response = await fetch(config.CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to upload image');
    }

    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Type for Cloudinary transformation options
type CloudinaryTransformOptions = {
  width?: number | string;
  height?: number | string;
  crop?: string;
  quality?: number | string;
};

// Helper function to get image URL with transformations
export const getCloudinaryUrl = (publicId: string, options: CloudinaryTransformOptions = {}) => {
  const transformations: string[] = [];
  
  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  
  const transformationString = transformations.join(',');
  
  return `https://res.cloudinary.com/${config.CLOUDINARY_CLOUD_NAME}/image/upload/${
    transformationString ? transformationString + '/' : ''
  }${publicId}`;
};
