import { Controller, Delete, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto, AttendanceRangeQueryDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post()
  register(@Body() dto: CreateAttendanceDto) {
    return this.attendanceService.register(dto);
  }

  @Get('today')
  @UseGuards(JwtAuthGuard)
  getToday() {
    return this.attendanceService.getTodayList();
  }

  @Get('range')
  @UseGuards(JwtAuthGuard)
  getRange(@Query() query: AttendanceRangeQueryDto) {
    return this.attendanceService.getRangeList(
      query.period,
      query.date,
      query.eventId,
      query.weekday,
    );
  }

  @Get('history/:participantId')
  @UseGuards(JwtAuthGuard)
  getHistory(@Param('participantId') participantId: string) {
    return this.attendanceService.getHistory(participantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}
