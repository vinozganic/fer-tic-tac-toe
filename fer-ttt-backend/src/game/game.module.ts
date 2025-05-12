import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { GameService } from './game.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: '24h' },
    }),
    UsersModule,
  ],
  providers: [GameGateway, GameService],
  exports: [GameGateway, GameService],
})
export class GameModule {}
