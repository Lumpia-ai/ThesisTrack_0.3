import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';
import { getRequiredEnv } from '@/lib/utils';

let isConfigured = false;

export function getCloudinaryClient() {
  if (!isConfigured) {
    cloudinary.config({
      cloud_name: getRequiredEnv('CLOUDINARY_CLOUD_NAME'),
      api_key: getRequiredEnv('CLOUDINARY_API_KEY'),
      api_secret: getRequiredEnv('CLOUDINARY_API_SECRET'),
      secure: true
    });
    isConfigured = true;
  }

  return cloudinary;
}

export function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadApiOptions = {}
): Promise<UploadApiResponse> {
  const client = getCloudinaryClient();

  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        resource_type: 'auto',
        ...options
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload failed.'));
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

// Removes a profile photo this app uploaded (identified by its secure_url). URLs from
// anywhere else — an external avatar, a branding asset — are left alone.
export async function deleteProfileImageFromCloudinary(secureUrl: string | null | undefined) {
  const match = secureUrl?.match(/\/(thesistrack\/profiles\/[^/?#]+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);

  if (!match) {
    return;
  }

  await getCloudinaryClient().uploader.destroy(match[1], { resource_type: 'image' });
}
