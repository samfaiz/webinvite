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
import { DesignsService } from './designs.service';
import { SaveDesignDto } from './designs.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/auth.decorators';

@Controller()
export class DesignsController {
  constructor(private svc: DesignsService) {}

  /* public catalog */
  @Get('designs')
  list() {
    return this.svc.listActive();
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
