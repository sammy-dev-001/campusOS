# Cloudinary Integration for CampusOS

This document outlines the steps to set up and configure Cloudinary for file uploads in the CampusOS application.

## Prerequisites

1. A Cloudinary account (free tier available at [cloudinary.com](https://cloudinary.com))
2. Node.js and npm installed on your development machine
3. Existing CampusOS backend setup

## Setup Instructions

### 1. Get Cloudinary Credentials

1. Sign in to your Cloudinary dashboard at [https://cloudinary.com/console](https://cloudinary.com/console)
2. Note down your Cloud Name, API Key, and API Secret from the dashboard

### 2. Set Up Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. For Production (Render)

Add these environment variables to your Render dashboard:

1. Go to your Render dashboard
2. Select your CampusOS backend service
3. Go to the "Environment" tab
4. Add the following environment variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

## Available Upload Endpoints

1. **General File Upload**
   - `POST /api/upload` - Upload any file (max 50MB)
   - Accepts: `multipart/form-data` with a `file` field
   - Returns: Cloudinary URL and file metadata

2. **Post Media**
   - `POST /posts` - Create a new post with media
   - Accepts: `multipart/form-data` with `media` field
   - Automatically handles image and video uploads

3. **Chat Files**
   - `POST /api/chat/upload` - Upload files for chat
   - Accepts: `multipart/form-data` with `file` field
   - Handles various file types including documents

## File Types and Limits

- **Profile Pictures**: Images only, max 10MB
- **Post Media**: Images and videos, max 50MB
- **Chat Files**: All file types, max 50MB
- **Documents**: PDF, DOC, DOCX, TXT, max 50MB
- **Event Images**: Images only, max 10MB

## Security Notes

- All uploads are stored in your Cloudinary account
- Files are organized in folders by type (e.g., `campusOS/profile_pictures/`)
- API keys should be kept secret and never committed to version control
- Consider setting up Cloudinary's security settings for production use

## Troubleshooting

- **Upload Fails**: Check file size limits and supported formats
- **Missing Environment Variables**: Ensure all required variables are set in both development and production
- **CORS Issues**: Verify CORS settings in your Cloudinary account

For more information, refer to the [Cloudinary Documentation](https://cloudinary.com/documentation).
