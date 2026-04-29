export class AddLeaderDto {
  employeeId!: number;
  // leaderType: 1=部門長, 2=副部門長
  leaderType!: number;
  isPrimaryLeader?: boolean;
  startDate!: string; // ISO date string (yyyy-MM-dd)
}
