import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateAccessRoleDto, UpdateAccessRoleDto } from './dto/role.dto';
import {
  ParticipantJwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
} from './guards/permissions.guard';

@Controller('actividades')
@UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get('permissions')
  @RequirePermissions('roles.view')
  listPermissions() {
    return this.rolesService.listPermissions();
  }

  @Get('roles')
  @RequirePermissions('roles.view')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('roles/:id')
  @RequirePermissions('roles.view')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post('roles')
  @RequirePermissions('roles.create')
  create(@Body() dto: CreateAccessRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch('roles/:id')
  @RequirePermissions('roles.edit')
  update(@Param('id') id: string, @Body() dto: UpdateAccessRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete('roles/:id')
  @RequirePermissions('roles.delete')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
