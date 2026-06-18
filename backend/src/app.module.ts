import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { FieldsModule } from './modules/fields/fields.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { UsersModule } from './modules/users/users.module';
import { DevModule } from './modules/dev/dev.module';
import { BootstrapService } from './bootstrap/bootstrap.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ParticipantsModule,
    AttendanceModule,
    FieldsModule,
    DashboardModule,
    CatalogModule,
    UsersModule,
    DevModule,
  ],
  providers: [BootstrapService],
})
export class AppModule {}
