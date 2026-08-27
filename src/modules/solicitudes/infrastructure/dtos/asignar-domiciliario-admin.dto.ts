import { IsUUID } from 'class-validator';

export class AsignarDomiciliarioAdminDto {
  @IsUUID()
  domiciliarioId: string;
}
