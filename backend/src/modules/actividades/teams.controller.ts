import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto, TeamMembersDto, UpdateTeamDto } from './dto/team.dto';
import {
  ParticipantJwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
} from './guards/permissions.guard';

@Controller('actividades/teams')
@UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get()
  @RequirePermissions('teams.view')
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('teams.view')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  @RequirePermissions('teams.create')
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('teams.edit')
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('teams.delete')
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }

  @Post(':id/members')
  @RequirePermissions('teams.manage_members')
  addMembers(@Param('id') id: string, @Body() dto: TeamMembersDto) {
    return this.teamsService.addMembers(id, dto);
  }

  @Put(':id/members')
  @RequirePermissions('teams.manage_members')
  setMembers(@Param('id') id: string, @Body() dto: TeamMembersDto) {
    return this.teamsService.setMembers(id, dto);
  }

  @Delete(':id/members/:participantId')
  @RequirePermissions('teams.manage_members')
  removeMember(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
  ) {
    return this.teamsService.removeMember(id, participantId);
  }
}
