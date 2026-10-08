import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AgentKeyGuard } from './agent.guard';
import { AgentService } from './agent.service';

/**
 * /api/agent — read and change invitations from a script, locked by the
 * `x-agent-key` header (AGENT_API_KEY). `:ref` is an invitation's id or slug.
 *
 *   GET    invitations?q=…                      list (search names, slug, owner)
 *   GET    invitations/:ref                     everything about one
 *   PATCH  invitations/:ref                     { ops, note?, dryRun? }  small edits by path
 *   PUT    invitations/:ref                     { content?, theme?, templateId?, … }  replace parts
 *   POST   invitations                          { ownerEmail, copyFrom? | content+theme+… }  new draft
 *   POST   invitations/:ref/publish | unpublish
 *   DELETE invitations/:ref?confirm=<slug>      delete (saved first, restorable)
 *   GET    invitations/:ref/revisions           the saved copies, newest first
 *   POST   revisions/:id/restore                put one back
 *
 * (The bodies are free-form JSON, checked by the service, so they're typed
 * loosely here and the global whitelist leaves them whole.)
 */
@UseGuards(AgentKeyGuard)
@Controller('agent')
export class AgentController {
  constructor(private svc: AgentService) {}

  @Get('invitations')
  list(@Query('q') q?: string) {
    return this.svc.list(q);
  }

  @Get('invitations/:ref')
  get(@Param('ref') ref: string) {
    return this.svc.get(ref);
  }

  @Patch('invitations/:ref')
  patch(@Param('ref') ref: string, @Body() body: Record<string, any>) {
    return this.svc.patch(ref, body);
  }

  @Put('invitations/:ref')
  replace(@Param('ref') ref: string, @Body() body: Record<string, any>) {
    return this.svc.replace(ref, body);
  }

  @Post('invitations')
  create(@Body() body: Record<string, any>) {
    return this.svc.create(body);
  }

  @Post('invitations/:ref/publish')
  publish(@Param('ref') ref: string) {
    return this.svc.publish(ref);
  }

  @Post('invitations/:ref/unpublish')
  unpublish(@Param('ref') ref: string) {
    return this.svc.unpublish(ref);
  }

  @Delete('invitations/:ref')
  remove(@Param('ref') ref: string, @Query('confirm') confirm?: string) {
    return this.svc.remove(ref, confirm);
  }

  @Get('invitations/:ref/revisions')
  revisions(@Param('ref') ref: string) {
    return this.svc.revisions(ref);
  }

  @Post('revisions/:id/restore')
  restore(@Param('id') id: string) {
    return this.svc.restore(id);
  }
}
