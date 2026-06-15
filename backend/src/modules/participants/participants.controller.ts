import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import {
  CreateParticipantDto,
  UpdateParticipantDto,
  ParticipantQueryDto,
} from './dto/participant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('participants')
export class ParticipantsController {
  constructor(private participantsService: ParticipantsService) {}

  @Post()
  create(@Body() dto: CreateParticipantDto) {
    return this.participantsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() query: ParticipantQueryDto) {
    return this.participantsService.findAll(query);
  }

  @Get('code/:code/completeness')
  @UseGuards(JwtAuthGuard)
  getCompleteness(@Param('code') code: string) {
    return this.participantsService.getCompletenessByCode(code);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.participantsService.findByCode(code);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.participantsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateParticipantDto) {
    return this.participantsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.participantsService.remove(id);
  }
}
