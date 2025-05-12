import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../users/users.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getLeaderboard(@Query('limit') limit?: string) {
    const limitValue = limit ? parseInt(limit, 10) : 10;
    const users = await this.usersService.getLeaderboard(limitValue);

    // Transform the response to include derived statistics
    return users.map((user, index) => {
      const totalGames = user.wins + user.losses;
      const winRate = totalGames > 0 ? (user.wins / totalGames) * 100 : 0;

      return {
        rank: index + 1,
        id: user.id,
        username: user.username,
        wins: user.wins,
        losses: user.losses,
        totalGames,
        winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
      };
    });
  }
}
