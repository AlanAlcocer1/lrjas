import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSocialPostDto, UpdateSocialPostDto } from './dto/social-post.dto';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  private format(post: {
    id: string;
    title: string;
    postUrl: string;
    platform: string;
    active: boolean;
    featured: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: post.id,
      title: post.title,
      postUrl: post.postUrl,
      platform: post.platform,
      active: post.active,
      featured: post.featured,
      sortOrder: post.sortOrder,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  findPublicFeed() {
    return this.prisma.socialPost
      .findMany({
        where: { active: true, featured: true },
        orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
        take: 6,
      })
      .then((items) => items.map((p) => this.format(p)));
  }

  findAllAdmin() {
    return this.prisma.socialPost
      .findMany({ orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }] })
      .then((items) => items.map((p) => this.format(p)));
  }

  async create(dto: CreateSocialPostDto) {
    const post = await this.prisma.socialPost.create({
      data: {
        title: dto.title.trim(),
        postUrl: dto.postUrl.trim(),
        platform: dto.platform,
        active: dto.active ?? true,
        featured: dto.featured ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return this.format(post);
  }

  async update(id: string, dto: UpdateSocialPostDto) {
    await this.ensureExists(id);
    const post = await this.prisma.socialPost.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.postUrl !== undefined && { postUrl: dto.postUrl.trim() }),
        ...(dto.platform !== undefined && { platform: dto.platform }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.featured !== undefined && { featured: dto.featured }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
    return this.format(post);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.socialPost.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureExists(id: string) {
    const post = await this.prisma.socialPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Publicación no encontrada');
  }
}
