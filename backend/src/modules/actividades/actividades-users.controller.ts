import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActividadesUsersService } from './actividades-users.service';
import { AssignRolesDto } from './dto/role.dto';
import {
  ParticipantJwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
} from './guards/permissions.guard';

@Controller('actividades/users')
@UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
export class ActividadesUsersController {
  constructor(private usersService: ActividadesUsersService) {}

  @Get()
  @RequirePermissions('users.view')
  search(@Query('q') q?: string) {
    return this.usersService.search(q);
  }

  @Get('code/:code')
  @RequirePermissions('users.view')
  findByCode(@Param('code') code: string) {
    return this.usersService.findByCode(code);
  }

  @Get(':id')
  @RequirePermissions('users.view')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id/roles')
  @RequirePermissions('users.assign_roles')
  assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto) {
    return this.usersService.assignRoles(id, dto);
  }
}
