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
import { DesignsService } from './designs.service';
import { ReactDto, SaveDesignDto } from './designs.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles, type AuthUser } from '../auth/auth.decorators';

@Controller()
export class DesignsController {
  constructor(private svc: DesignsService) {}

  /* public catalog */
  @Get('designs')
  list() {
    return this.svc.listActive();
  }

  /** Explore feed. Declared before `designs/:id` so "explore" is not read as an id. */
  @Get('designs/explore')
  explore(
    @Query('category') category?: string,
    @Query('community') community?: string,
    @Query('country') country?: string,
  ) {
    return this.svc.explore({ category, community, country });
  }

  /* reactions — signed-in guests only */
  @UseGuards(JwtAuthGuard)
  @Get('designs/reactions/mine')
  myReactions(@CurrentUser() user: AuthUser) {
    return this.svc.myReactions(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('designs/:id/react')
  react(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReactDto,
  ) {
    return this.svc.react(user.id, id, dto.kind);
  }

  @Get('designs/:id')
  get(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  /* admin management */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/designs')
  all() {
    return this.svc.listAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('designs')
  create(@Body() dto: SaveDesignDto) {
    return this.svc.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('designs/:id')
  update(@Param('id') id: string, @Body() dto: SaveDesignDto) {
    return this.svc.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('designs/:id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
