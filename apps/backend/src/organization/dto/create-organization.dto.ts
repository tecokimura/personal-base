export class CreateOrganizationDto {
  organizationName!: string;
  organizationCode?: string;
  parentOrganizationId?: number;
  displayOrder?: number;
}
