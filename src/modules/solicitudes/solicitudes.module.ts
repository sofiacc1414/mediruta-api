import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AceptarPedidoUseCase } from './application/use-cases/aceptar-pedido.use-case';
import { ActualizarConfiguracionAdminUseCase } from './application/use-cases/actualizar-configuracion-admin.use-case';
import { ActualizarSolicitudUseCase } from './application/use-cases/actualizar-solicitud.use-case';
import { AdjuntarRecetaPropuestaEdicionUseCase } from './application/use-cases/adjuntar-receta-propuesta-edicion.use-case';
import { AprobarEdicionPedidoAdminUseCase } from './application/use-cases/aprobar-edicion-pedido-admin.use-case';
import { AsignarDomiciliarioAdminUseCase } from './application/use-cases/asignar-domiciliario-admin.use-case';
import { CancelarSolicitudUseCase } from './application/use-cases/cancelar-solicitud.use-case';
import { CrearSolicitudUseCase } from './application/use-cases/crear-solicitud.use-case';
import { EntregarPedidoUseCase } from './application/use-cases/entregar-pedido.use-case';
import { EnviarSolicitudUseCase } from './application/use-cases/enviar-solicitud.use-case';
import { IniciarEntregaUseCase } from './application/use-cases/iniciar-entrega.use-case';
import { ListarDomiciliariosCercanosAdminUseCase } from './application/use-cases/listar-domiciliarios-cercanos-admin.use-case';
import { ListarHistorialPedidosUseCase } from './application/use-cases/listar-historial-pedidos.use-case';
import { ListarNovedadesAbiertasUseCase } from './application/use-cases/listar-novedades-abiertas.use-case';
import { ListarNovedadesSolicitudUseCase } from './application/use-cases/listar-novedades-solicitud.use-case';
import { ListarPedidosAdminUseCase } from './application/use-cases/listar-pedidos-admin.use-case';
import { ListarPedidosDisponiblesUseCase } from './application/use-cases/listar-pedidos-disponibles.use-case';
import { ListarSolicitudesUseCase } from './application/use-cases/listar-solicitudes.use-case';
import { MarcarEnSitioUseCase } from './application/use-cases/marcar-en-sitio.use-case';
import { MarcarMedicamentosRecogidosUseCase } from './application/use-cases/marcar-medicamentos-recogidos.use-case';
import { ObtenerConfiguracionAdminUseCase } from './application/use-cases/obtener-configuracion-admin.use-case';
import { ObtenerDetallePedidoAdminUseCase } from './application/use-cases/obtener-detalle-pedido-admin.use-case';
import { ObtenerDocumentosPacienteParaRecogerUseCase } from './application/use-cases/obtener-documentos-paciente-para-recoger.use-case';
import { ObtenerPedidoActivoUseCase } from './application/use-cases/obtener-pedido-activo.use-case';
import { ObtenerSolicitudUseCase } from './application/use-cases/obtener-solicitud.use-case';
import { RechazarEdicionPedidoAdminUseCase } from './application/use-cases/rechazar-edicion-pedido-admin.use-case';
import { ReenviarCodigoEntregaCorreoAdminUseCase } from './application/use-cases/reenviar-codigo-entrega-correo-admin.use-case';
import { RegenerarCodigoEntregaAdminUseCase } from './application/use-cases/regenerar-codigo-entrega-admin.use-case';
import { ReportarCodigoNoGeneradoUseCase } from './application/use-cases/reportar-codigo-no-generado.use-case';
import { ReportarNovedadPacienteUseCase } from './application/use-cases/reportar-novedad-paciente.use-case';
import { ReportarNovedadUseCase } from './application/use-cases/reportar-novedad.use-case';
import { ResolverNovedadUseCase } from './application/use-cases/resolver-novedad.use-case';
import { SolicitarEdicionPedidoUseCase } from './application/use-cases/solicitar-edicion-pedido.use-case';
import { SubirRecetaUseCase } from './application/use-cases/subir-receta.use-case';
import { CorreoCodigoEntregaPort } from './domain/ports/correo-codigo-entrega.port';
import { GeocodificacionPort } from './domain/ports/geocodificacion.port';
import { SolicitudRepositoryPort } from './domain/ports/solicitud.repository.port';
import { NominatimGeocodificacionAdapter } from './infrastructure/adapters/nominatim-geocodificacion.adapter';
import { PostgresSolicitudRepository } from './infrastructure/adapters/postgres-solicitud.repository';
import { ResendCorreoCodigoEntregaAdapter } from './infrastructure/adapters/resend-correo-codigo-entrega.adapter';
import { ConfiguracionAdminController } from './infrastructure/controllers/configuracion-admin.controller';
import { NovedadesAdminController } from './infrastructure/controllers/novedades-admin.controller';
import { PedidosAdminController } from './infrastructure/controllers/pedidos-admin.controller';
import { PedidosDomiciliarioController } from './infrastructure/controllers/pedidos-domiciliario.controller';
import { SolicitudesController } from './infrastructure/controllers/solicitudes.controller';

/** HU-03/HU-09/HU-07 — casos de uso sobre solicitudes/pedidos, de los
 * 3 roles que los tocan (Paciente los crea, Domiciliario los recorre,
 * Administrador ve las novedades). Importa UsuariosModule para
 * reutilizar AccessAuthGuard/RolesGuard, mismo mecanismo construido en
 * HU-08. */
@Module({
  imports: [UsuariosModule],
  controllers: [
    SolicitudesController,
    PedidosDomiciliarioController,
    NovedadesAdminController,
    PedidosAdminController,
    ConfiguracionAdminController,
  ],
  providers: [
    CrearSolicitudUseCase,
    ListarSolicitudesUseCase,
    ObtenerSolicitudUseCase,
    ActualizarSolicitudUseCase,
    SubirRecetaUseCase,
    EnviarSolicitudUseCase,
    CancelarSolicitudUseCase,
    ListarPedidosDisponiblesUseCase,
    AceptarPedidoUseCase,
    MarcarMedicamentosRecogidosUseCase,
    IniciarEntregaUseCase,
    MarcarEnSitioUseCase,
    EntregarPedidoUseCase,
    ReportarNovedadUseCase,
    ReportarNovedadPacienteUseCase,
    SolicitarEdicionPedidoUseCase,
    AdjuntarRecetaPropuestaEdicionUseCase,
    ListarNovedadesSolicitudUseCase,
    ReportarCodigoNoGeneradoUseCase,
    ListarNovedadesAbiertasUseCase,
    ResolverNovedadUseCase,
    AprobarEdicionPedidoAdminUseCase,
    RechazarEdicionPedidoAdminUseCase,
    RegenerarCodigoEntregaAdminUseCase,
    ReenviarCodigoEntregaCorreoAdminUseCase,
    ObtenerPedidoActivoUseCase,
    ListarHistorialPedidosUseCase,
    ObtenerDocumentosPacienteParaRecogerUseCase,
    ListarPedidosAdminUseCase,
    ObtenerDetallePedidoAdminUseCase,
    ListarDomiciliariosCercanosAdminUseCase,
    AsignarDomiciliarioAdminUseCase,
    ObtenerConfiguracionAdminUseCase,
    ActualizarConfiguracionAdminUseCase,
    {
      provide: SolicitudRepositoryPort,
      useClass: PostgresSolicitudRepository,
    },
    {
      provide: GeocodificacionPort,
      useClass: NominatimGeocodificacionAdapter,
    },
    {
      provide: CorreoCodigoEntregaPort,
      useClass: ResendCorreoCodigoEntregaAdapter,
    },
  ],
})
export class SolicitudesModule {}
