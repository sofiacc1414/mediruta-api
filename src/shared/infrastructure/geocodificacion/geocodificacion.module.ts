import { Global, Module } from '@nestjs/common';
import { GeocodificacionPort } from '../../../modules/solicitudes/domain/ports/geocodificacion.port';
import { NominatimGeocodificacionAdapter } from '../../../modules/solicitudes/infrastructure/adapters/nominatim-geocodificacion.adapter';

/** Ronda 10 — `GeocodificacionPort` vivía registrado solo dentro de
 * `SolicitudesModule`; cuando `UsuariosModule` necesitó geocodificar
 * también (validar la dirección del perfil, ver
 * `ActualizarPerfilPacienteUseCase`), importar `SolicitudesModule`
 * directo no era una opción — ese módulo ya importa `UsuariosModule`,
 * así que hubiera sido una dependencia circular.
 *
 * Más importante que la dependencia circular en sí: `NominatimGeocodificacionAdapter`
 * mantiene el rate-limit de 1 request/segundo que exige Nominatim como
 * estado de instancia (`ultimaLlamadaEn`) — si cada módulo registrara
 * su PROPIA instancia del adapter, ese límite dejaría de ser
 * realmente global (dos módulos podrían pegarle a Nominatim a la vez,
 * 2 req/s en vez de 1, arriesgando que bloqueen la IP). Por eso esto
 * vive en un módulo aparte, `@Global()`, con una única instancia para
 * toda la API — el mismo problema, a escala de proceso, que ya se
 * corrigió del lado de la App con el fix de "cada tecla dispara un
 * geocode" (ver `NuevaSolicitudScreen`).
 *
 * `@Global()` porque el consumo es transversal (hoy: solicitudes y
 * usuarios; puede sumar más módulos) y no tiene sentido reimportarlo
 * en cada uno solo para volver a exponer el mismo token. */
@Global()
@Module({
  providers: [
    {
      provide: GeocodificacionPort,
      useClass: NominatimGeocodificacionAdapter,
    },
  ],
  exports: [GeocodificacionPort],
})
export class GeocodificacionModule {}
