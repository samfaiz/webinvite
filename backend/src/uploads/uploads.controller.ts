import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import type { Request } from 'express';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/auth.decorators';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
  },
});

const isImage = (m: string) => /^image\/(png|jpe?g|webp|gif|avif)$/.test(m);
const isAudio = (m: string) => /^audio\/(mpeg|mp3|ogg|wav|x-wav|webm|aac|mp4|x-m4a)$/.test(m);
const isVideo = (m: string) => /^video\/(mp4|webm|ogg|quicktime)$/.test(m);

const isImageOrAudio = (m: string) => isImage(m) || isAudio(m);

/** Couple media: photos, intro video, and their own music (MP3 etc.). */
const isCoupleMedia = (m: string) => isImage(m) || isVideo(m) || isAudio(m);

function fileUrl(file: Express.Multer.File, req: Request) {
  const origin = `${req.protocol}://${req.get('host')}`;
  return { url: `${origin}/uploads/${file.filename}`, filename: file.filename };
}

@Controller('uploads')
export class UploadsController {
  /** Admin asset upload (design backgrounds, library audio). */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => cb(null, isImageOrAudio(file.mimetype)),
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('No file (field "file")');
    return fileUrl(file, req);
  }

  /** Couple media upload (photos, custom intro video). Any signed-in user. */
  @UseGuards(JwtAuthGuard)
  @Post('media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 80 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => cb(null, isCoupleMedia(file.mimetype)),
    }),
  )
  uploadMedia(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('No file, or unsupported file type (field "file")');
    return fileUrl(file, req);
  }
}
