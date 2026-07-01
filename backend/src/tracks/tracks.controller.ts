import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { TracksService } from './tracks.service';
import { SaveTrackDto } from './tracks.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/auth.decorators';

@Controller()
export class TracksController {
  constructor(private svc: TracksService) {}

  /* public — couples pick from active tracks */
  @Get('tracks')
  list() {
    return this.svc.listActive();
  }

  /* admin management */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/tracks')
  all() {
    return this.svc.listAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('tracks')
  create(@Body() dto: SaveTrackDto) {
    return this.svc.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('tracks/:id')
  update(@Param('id') id: string, @Body() dto: SaveTrackDto) {
    return this.svc.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('tracks/:id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
