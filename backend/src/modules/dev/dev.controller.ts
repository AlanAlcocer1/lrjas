import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DevUserGuard } from './guards/dev-user.guard';
import { DevService } from './dev.service';
import { ExecuteSqlDto } from './dto/execute-sql.dto';

@Controller('dev')
@UseGuards(JwtAuthGuard, DevUserGuard)
export class DevController {
  constructor(private devService: DevService) {}

  @Post('sql')
  executeSql(@Body() dto: ExecuteSqlDto) {
    return this.devService.executeReadOnlyQuery(dto.query);
  }
}
