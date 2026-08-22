import { Controller, Get } from '@nestjs/common';

/**
 * Health check de infraestructura. No es un caso de uso de negocio,
 * así que vive aquí y no dentro de modules/ (ver context.md, sección 5).
 */
@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'mediruta-api' };
  }
}
