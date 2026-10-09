import { NextResponse } from 'next/server';
import { getCloudinaryClient, uploadBufferToCloudinary } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { UserRole } from '@/generated/prisma/client';
import { withApiLogging } from '@/lib/api-logging';

// IMPORTANT MEDIA STORAGE NOTE:
// 1. Cloudinary is ONLY used for system branding assets (logos, login backgrounds, etc).
// 2. Supabase Storage remains the primary storage for ALL user documents:
//    - PDFs, Manuscripts, Project Files
//    - Research outputs and Repository documents
//    - User profile pictures
// Do NOT upload documents to Cloudinary.

// 20MB limit
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm'];

async function handlePOST(request: Request) {
  try {
    // 1. Role Protection
    const user = await requireAuthenticatedUser(request);
    
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return NextResponse.json({ error: 'Forbidden. Only System Admins can upload branding media.' }, { status: 403 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const oldPublicId = formData.get('oldPublicId') as string | null;
    const type = formData.get('type') as string | null;
    const label = formData.get('label') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 3. Validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, WEBP, SVG, MP4, and WEBM are allowed.' }, { status: 400 });
    }

    // 4. Upload to Cloudinary using uploadBufferToCloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await uploadBufferToCloudinary(buffer, {
      folder: 'thesistrack/branding',
      format: file.type === 'image/svg+xml' ? 'svg' : undefined,
    });

    // 5. Save to DB and delete old asset if replacing
    let assetRecord = null;
    if (type) {
      // Find existing asset of this type
      const existing = await prisma.brandingAsset.findFirst({ where: { type: type as any } });
      
      if (existing) {
        try {
          const client = getCloudinaryClient();
          const resourceType = existing.url.includes('/video/') ? 'video' : 'image';
          await client.uploader.destroy(existing.publicId, { resource_type: resourceType });
        } catch (err) {
          console.error('Failed to delete old Cloudinary asset:', err);
        }

        // Update record
        assetRecord = await prisma.brandingAsset.update({
          where: { id: existing.id },
          data: {
            url: result.secure_url,
            publicId: result.public_id,
            label: label || undefined,
            uploadedById: user.id.toString(),
          }
        });
      } else {
        // Create new record
        assetRecord = await prisma.brandingAsset.create({
          data: {
            url: result.secure_url,
            publicId: result.public_id,
            type: type as any,
            label: label || undefined,
            uploadedById: user.id.toString(),
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        secure_url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        asset: assetRecord
      }
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiLogging('POST', '/api/admin/media/upload', handlePOST);
