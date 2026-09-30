import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import {
  ParticipantJwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
} from './guards/permissions.guard';

@Controller('actividades/audit')
@UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logins')
  @RequirePermissions('audit.view')
  listLogins(@Query('take') take?: string) {
    const n = take ? Number(take) : 100;
    return this.auditService.listLogins(Number.isFinite(n) ? n : 100);
  }

  @Get('history')
  @RequirePermissions('audit.view')
  listHistory(@Query('take') take?: string) {
    const n = take ? Number(take) : 100;
    return this.auditService.listActivityHistory(Number.isFinite(n) ? n : 100);
  }
}
