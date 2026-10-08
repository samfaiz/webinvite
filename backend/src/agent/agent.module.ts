import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module';
import { AgentController } from './agent.controller';
import { AgentKeyGuard } from './agent.guard';
import { AgentService } from './agent.service';

@Module({
  imports: [InvitationsModule],
  controllers: [AgentController],
  providers: [AgentService, AgentKeyGuard],
})
export class AgentModule {}
