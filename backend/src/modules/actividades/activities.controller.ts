import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ActivitiesService } from './activities.service';
import { CalendarIcsService } from './calendar-ics.service';
import {
  ActivityQueryDto,
  ApprovalActionDto,
  CreateActivityDto,
  CreateActivityStatusDto,
  CreateTaskDto,
  UpdateActivityDto,
  UpdateActivityStatusDto,
  UpdateTaskDto,
} from './dto/activity.dto';
import {
  ActividadesUser,
  ParticipantJwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
} from './guards/permissions.guard';

@Controller('actividades')
export class ActivitiesController {
  constructor(
    private activitiesService: ActivitiesService,
    private icsService: CalendarIcsService,
  ) {}

  // ── Públicos ──────────────────────────────────────────

  @Get('public/activities')
  listPublic(@Query('from') from?: string, @Query('to') to?: string) {
    return this.activitiesService.listPublic(from, to);
  }

  @Get('public/activities/:id')
  findPublic(@Param('id') id: string) {
    return this.activitiesService.findPublicOne(id);
  }

  @Get('calendar/public.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'inline; filename="lrjas-actividades.ics"')
  async publicIcs(@Res() res: Response) {
    const baseUrl =
      process.env.ACTIVIDADES_PUBLIC_URL || 'https://actividades.lrjasmerida.me';
    const body = await this.icsService.publicFeed(baseUrl);
    res.send(body);
  }

  @Get('public/activities/:id/event.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  async singleIcs(@Param('id') id: string, @Res() res: Response) {
    const baseUrl =
      process.env.ACTIVIDADES_PUBLIC_URL || 'https://actividades.lrjasmerida.me';
    const body = await this.icsService.singleEventIcs(id, baseUrl);
    if (!body) throw new NotFoundException('Actividad no encontrada');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="actividad-${id}.ics"`,
    );
    res.send(body);
  }

  // ── Autenticados ──────────────────────────────────────

  @Get('dashboard')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('activities.view')
  dashboard(@Req() req: { user: ActividadesUser }) {
    return this.activitiesService.dashboard(req.user.id);
  }

  @Get('activities')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('activities.view')
  list(@Query() query: ActivityQueryDto) {
    return this.activitiesService.list(query);
  }

  @Get('activities/:id')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('activities.view')
  findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @Post('activities')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('activities.create')
  create(
    @Body() dto: CreateActivityDto,
    @Req() req: { user: ActividadesUser },
  ) {
    return this.activitiesService.create(dto, req.user.id);
  }

  @Patch('activities/:id')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('activities.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @Req() req: { user: ActividadesUser },
  ) {
    return this.activitiesService.update(id, dto, req.user.id);
  }

  @Delete('activities/:id')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('activities.delete')
  remove(@Param('id') id: string, @Req() req: { user: ActividadesUser }) {
    return this.activitiesService.remove(id, req.user.id);
  }

  @Get('activities/:id/history')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('history.view')
  history(@Param('id') id: string) {
    return this.activitiesService.history(id);
  }

  @Post('activities/:id/approve')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('activities.approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
    @Req() req: { user: ActividadesUser },
  ) {
    return this.activitiesService.approve(id, req.user.id, dto);
  }

  @Post('activities/:id/reject')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('approvals.reject')
  reject(
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
    @Req() req: { user: ActividadesUser },
  ) {
    return this.activitiesService.reject(id, req.user.id, dto);
  }

  @Post('activities/:id/request-changes')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('approvals.request_changes')
  requestChanges(
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
    @Req() req: { user: ActividadesUser },
  ) {
    return this.activitiesService.requestChanges(id, req.user.id, dto);
  }

  @Post('activities/:id/tasks')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('tasks.create')
  createTask(
    @Param('id') id: string,
    @Body() dto: CreateTaskDto,
    @Req() req: { user: ActividadesUser },
  ) {
    return this.activitiesService.createTask(id, dto, req.user.id);
  }

  @Patch('tasks/:id')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('tasks.edit')
  updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: { user: ActividadesUser },
  ) {
    return this.activitiesService.updateTask(id, dto, req.user.id);
  }

  @Delete('tasks/:id')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('tasks.delete')
  deleteTask(@Param('id') id: string, @Req() req: { user: ActividadesUser }) {
    return this.activitiesService.deleteTask(id, req.user.id);
  }

  @Get('tasks')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('tasks.view')
  listTasks(@Query('from') from?: string, @Query('to') to?: string) {
    return this.activitiesService.listTasks(from, to);
  }

  @Get('my-tasks')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('tasks.view')
  myTasks(@Req() req: { user: ActividadesUser }) {
    return this.activitiesService.myTasks(req.user.id);
  }

  @Get('statuses')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('activities.view')
  listStatuses() {
    return this.activitiesService.listStatuses();
  }

  @Post('statuses')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  createStatus(@Body() dto: CreateActivityStatusDto) {
    return this.activitiesService.createStatus(dto);
  }

  @Patch('statuses/:id')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateActivityStatusDto) {
    return this.activitiesService.updateStatus(id, dto);
  }

  @Delete('statuses/:id')
  @UseGuards(ParticipantJwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  deleteStatus(@Param('id') id: string) {
    return this.activitiesService.deleteStatus(id);
  }
}
