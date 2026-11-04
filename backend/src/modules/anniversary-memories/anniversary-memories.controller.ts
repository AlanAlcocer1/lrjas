import {
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AnniversaryMemoriesService } from './anniversary-memories.service';

@Controller('anniversary-memories')
export class AnniversaryMemoriesController {
  constructor(private memories: AnniversaryMemoriesService) {}

  private assertModerationPassword(password?: string) {
    const expected = (process.env.ANNIVERSARY_MODERATION_PASSWORD || 'Alan2908').trim();
    if (!password || password.trim() !== expected) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }
  }

  @Get()
  list(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const n = limit ? Number(limit) : 100;
    const o = offset ? Number(offset) : 0;
    return this.memories.list({
      limit: Number.isFinite(n) ? n : 100,
      offset: Number.isFinite(o) ? o : 0,
      from: from || undefined,
      to: to || undefined,
    });
  }

  @Get('summary')
  summary() {
    return this.memories.summary();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const mime = (file.mimetype || '').toLowerCase();
        const name = (file.originalname || '').toLowerCase();
        if (mime.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(name)) {
          cb(new Error('Solo se permiten fotos, no videos'), false);
          return;
        }
        if (!mime.startsWith('image/')) {
          cb(new Error('Solo se permiten fotos (JPG, PNG o WebP)'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body('authorName') authorName: string,
    @Body('memoryDate') memoryDate: string,
    @Body('caption') caption: string,
  ) {
    return this.memories.create({ authorName, memoryDate, caption, file });
  }

  @Post('moderation/unlock')
  unlock(@Headers('x-moderation-password') password?: string) {
    this.assertModerationPassword(password);
    return { ok: true as const };
  }

  /** Moderación desde la cápsula: header `x-moderation-password`. */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers('x-moderation-password') password?: string,
  ) {
    this.assertModerationPassword(password);
    return this.memories.remove(id);
  }
}
