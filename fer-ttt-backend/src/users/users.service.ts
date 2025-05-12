import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(username: string, password: string): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('Username is already taken');
    }

    // Hash the password
    const hashedPassword = await this.hashPassword(password);

    const user = this.usersRepository.create({
      username,
      password: hashedPassword,
      wins: 0,
      losses: 0,
    });

    return this.usersRepository.save(user);
  }

  async findOneByUsername(username: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    return user;
  }

  async findOneById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async update(id: number, updateData: Partial<User>): Promise<User> {
    if (updateData.password) {
      updateData.password = await this.hashPassword(updateData.password);
    }

    await this.usersRepository.update(id, updateData);
    return this.findOneById(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  // Method to increment a user's wins
  async incrementWins(userId: string): Promise<User> {
    const user = await this.findOneById(Number(userId));
    user.wins += 1;
    return this.usersRepository.save(user);
  }

  // Method to increment a user's losses
  async incrementLosses(userId: string): Promise<User> {
    const user = await this.findOneById(Number(userId));
    user.losses += 1;
    return this.usersRepository.save(user);
  }

  // Method to get user stats
  async getUserStats(
    userId: string,
  ): Promise<{ wins: number; losses: number; winRate: number }> {
    const user = await this.findOneById(Number(userId));
    const totalGames = user.wins + user.losses;
    const winRate = totalGames > 0 ? (user.wins / totalGames) * 100 : 0;

    return {
      wins: user.wins,
      losses: user.losses,
      winRate: Math.round(winRate * 100) / 100,
    };
  }

  // Method to get leaderboard data (top players by wins)
  async getLeaderboard(limit: number = 10): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'username', 'wins', 'losses', 'createdAt'],
      order: { wins: 'DESC' },
      take: limit,
    });
  }
}
