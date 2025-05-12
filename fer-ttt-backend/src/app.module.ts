import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GameModule } from './game/game.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // TypeOrmModule.forRoot({
    //   type: 'sqlite',
    //   database: join(__dirname, '..', 'db', 'database.sqlite'),
    //   entities: [join(__dirname, '**', '*.entity.{ts,js}')],
    //   synchronize: true, // JAKOV: Set to false in production
    // }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5434),
        username: configService.get<string>('DB_USER', 'vinozganic'),
        password: configService.get<string>('DB_PASSWORD', 'vinozganic'),
        database: configService.get<string>('DB_NAME', 'fer_ttt_db'),
        entities: [join(__dirname, '**', '*.entity.{ts,js}')], // Keep entity loading path
        synchronize: configService.get<string>('NODE_ENV') !== 'production', // false in prod!
        ssl:
          configService.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false } // Needed for Render PostgreSQL connections
            : false,
      }),
    }),
    UsersModule,
    AuthModule,
    GameModule,
    LeaderboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
