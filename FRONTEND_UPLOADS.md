# File Uploads with Cloudinary

This document explains how to handle file uploads in the CampusOS frontend using Cloudinary.

## Table of Contents
- [Introduction](#introduction)
- [Uploading Files](#uploading-files)
- [Handling Different File Types](#handling-different-file-types)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Introduction

We use Cloudinary for handling all file uploads in the application. This includes:
- Profile pictures
- Post images and videos
- Chat attachments
- Documents

## Uploading Files

### Using the `uploadToCloudinary` Utility

We provide a utility function for uploading files to Cloudinary:

```typescript
import { uploadToCloudinary } from '../utils/fileUpload';

// Example: Upload an image
const handleImageUpload = async (imageUri: string) => {
  try {
    const result = await uploadToCloudinary({
      uri: imageUri,
      type: 'image', // or 'video' or 'document'
      name: 'my-image.jpg', // optional, will use filename from URI if not provided
      mimeType: 'image/jpeg' // optional, will be inferred from filename if not provided
    });
    
    console.log('Upload successful:', result.url);
    return result.url;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

### Uploading from Different Sources

#### Picking from Gallery

```typescript
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../utils/fileUpload';

const pickAndUploadImage = async () => {
  // Request permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Please grant permission to access your photos.');
    return;
  }

  // Pick an image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    const asset = result.assets[0];
    const uploadResult = await uploadToCloudinary({
      uri: asset.uri,
      type: 'image',
      name: asset.fileName || `image-${Date.now()}.jpg`,
      mimeType: asset.type === 'image' ? 'image/jpeg' : undefined
    });
    
    return uploadResult.url;
  }
};
```

#### Taking a Photo

```typescript
import * as ImagePicker from 'expo-image-picker';

const takeAndUploadPhoto = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Please grant camera permission to take photos.');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    const asset = result.assets[0];
    const uploadResult = await uploadToCloudinary({
      uri: asset.uri,
      type: 'image',
      name: `photo-${Date.now()}.jpg`
    });
    
    return uploadResult.url;
  }
};
```

## Handling Different File Types

### Images
- Supported formats: JPEG, PNG, GIF, WebP
- Recommended max size: 10MB
- Images are automatically optimized by Cloudinary

### Videos
- Supported formats: MP4, MOV, AVI, MKV
- Recommended max size: 100MB
- For large videos, consider compressing before upload

### Documents
- Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
- Max size: 25MB

## Best Practices

1. **Compress Before Upload**
   - For images, use `expo-image-manipulator` to resize and compress before upload
   - For videos, consider using a compression library if file size is a concern

2. **Show Upload Progress**
   - For large files, show a progress indicator
   - Use the `progress` event from `expo-file-system` if needed

3. **Handle Errors Gracefully**
   - Show user-friendly error messages
   - Implement retry logic for failed uploads

4. **Optimize for Mobile**
   - Handle content URIs on Android
   - Clean up temporary files after upload

## Troubleshooting

### Common Issues

1. **Upload Fails with Network Error**
   - Check internet connection
   - Verify the API URL is correct
   - Check CORS settings on the server

2. **File Too Large**
   - Check the file size before uploading
   - Compress or resize the file if needed

3. **Permission Issues**
   - Ensure you've requested the necessary permissions
   - On iOS, update `Info.plist` with required permissions

4. **File Type Not Supported**
   - Check the list of supported file types
   - Convert the file to a supported format if needed

### Debugging

To debug file uploads, add these logs:

```typescript
console.log('Uploading file:', {
  uri,
  size: (await FileSystem.getInfoAsync(uri)).size,
  type: mimeType
});

// Then in your upload function
const result = await uploadToCloudinary({ /* ... */ });
console.log('Upload result:', result);
```

## API Reference

### `uploadToCloudinary(options: UploadOptions)`

Uploads a file to Cloudinary.

**Parameters:**
- `options`: Object containing:
  - `uri`: string - Local file URI to upload
  - `type`: 'image' | 'video' | 'document' - Type of file
  - `name?`: string - Optional filename
  - `mimeType?`: string - Optional MIME type

**Returns:**
- Promise resolving to an object with:
  - `url`: string - Public URL of the uploaded file
  - `publicId`: string - Cloudinary public ID
  - `format`: string - File format
  - `type`: string - Resource type (image, video, etc.)
  - `size`: number - File size in bytes

**Throws:**
- Error if the upload fails
