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
import { SocialModule } from './modules/social/social.module';
import { EventsModule } from './modules/events/events.module';
import { ActividadesModule } from './modules/actividades/actividades.module';
import { RaffleModule } from './modules/raffle/raffle.module';
import { WalletPassesModule } from './modules/wallet-passes/wallet-passes.module';
import { AnniversaryMemoriesModule } from './modules/anniversary-memories/anniversary-memories.module';
import { ParticipaYaModule } from './modules/participa-ya/participa-ya.module';
import { StorageModule } from './modules/storage/storage.module';
import { BootstrapService } from './bootstrap/bootstrap.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StorageModule,
    PrismaModule,
    AuthModule,
    ParticipantsModule,
    AttendanceModule,
    FieldsModule,
    DashboardModule,
    CatalogModule,
    UsersModule,
    DevModule,
    SocialModule,
    EventsModule,
    ActividadesModule,
    RaffleModule,
    WalletPassesModule,
    AnniversaryMemoriesModule,
    ParticipaYaModule,
  ],
  providers: [BootstrapService],
})
export class AppModule {}
