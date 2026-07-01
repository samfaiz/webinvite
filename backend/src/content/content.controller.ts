import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { SaveContentDto } from './content.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/auth.decorators';

@Controller()
export class ContentController {
  constructor(private svc: ContentService) {}

  /* ------------------------------ public ------------------------------- */

  @Get('blog')
  listPosts() {
    return this.svc.listPublishedPosts();
  }

  @Get('blog/:slug')
  getPost(@Param('slug') slug: string) {
    return this.svc.getPublished('post', slug);
  }

  @Get('pages')
  listPages() {
    return this.svc.listPublishedPages();
  }

  @Get('pages/:slug')
  getPage(@Param('slug') slug: string) {
    return this.svc.getPublished('page', slug);
  }

  /* ------------------------- admin management -------------------------- */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/content')
  list(@Query('type') type: 'page' | 'post') {
    return this.svc.listByType(type === 'page' ? 'page' : 'post');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/content/:id')
  getOne(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('content')
  create(@Body() dto: SaveContentDto) {
    return this.svc.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('content/:id')
  update(@Param('id') id: string, @Body() dto: SaveContentDto) {
    return this.svc.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('content/:id/publish')
  publish(@Param('id') id: string) {
    return this.svc.publish(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('content/:id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.svc.unpublish(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('content/:id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
