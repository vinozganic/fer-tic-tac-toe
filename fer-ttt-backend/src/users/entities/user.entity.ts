import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  losses: number;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
