import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { CreateSocialPostDto, UpdateSocialPostDto } from './dto/social-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('social')
export class SocialController {
  constructor(private socialService: SocialService) {}

  @Get('feed')
  getFeed() {
    return this.socialService.findPublicFeed();
  }

  @Get('posts')
  @UseGuards(JwtAuthGuard)
  findAllAdmin() {
    return this.socialService.findAllAdmin();
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateSocialPostDto) {
    return this.socialService.create(dto);
  }

  @Put('posts/:id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateSocialPostDto) {
    return this.socialService.update(id, dto);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.socialService.remove(id);
  }
}
