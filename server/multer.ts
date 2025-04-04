import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories for different types of uploads
const galleryDir = path.join(uploadsDir, "gallery");
const shopDir = path.join(uploadsDir, "shop");
const profileDir = path.join(uploadsDir, "profiles");

if (!fs.existsSync(galleryDir)) {
  fs.mkdirSync(galleryDir, { recursive: true });
}

if (!fs.existsSync(shopDir)) {
  fs.mkdirSync(shopDir, { recursive: true });
}

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

// File size limits
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

// Allowed file types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'image/webp'
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg'
];

// File filter function
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const uploadType = req.path.includes('profile') 
    ? 'profile' 
    : req.path.includes('shop') 
      ? 'shop' 
      : 'gallery';
      
  if (uploadType === 'profile' && !ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only image files are allowed for profile pictures'));
  }
  
  if (uploadType === 'shop' && !ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only image files are allowed for shop items'));
  }
  
  if (uploadType === 'gallery') {
    if (![...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(file.mimetype)) {
      return cb(new Error('Only image and video files are allowed for gallery uploads'));
    }
  }
  
  cb(null, true);
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.path.includes('profile')) {
      cb(null, profileDir);
    } else if (req.path.includes('shop')) {
      cb(null, shopDir);
    } else {
      cb(null, galleryDir);
    }
  },
  filename: (req, file, cb) => {
    const randomName = randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    cb(null, `${randomName}${extension}`);
  }
});

// Export multer configurations
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Helper function to get file path for frontend
export function getFilePath(type: 'gallery' | 'shop' | 'profile', filename: string): string {
  return `/uploads/${type}/${filename}`;
}
