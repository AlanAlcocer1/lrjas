import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getStats(query.from, query.to);
  }
}
