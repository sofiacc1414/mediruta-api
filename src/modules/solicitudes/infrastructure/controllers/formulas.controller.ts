import {
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../../usuarios/infrastructure/decorators/roles.decorator';
import { DominioHttpFilter } from '../../../usuarios/infrastructure/filters/dominio-http.filter';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { RolesGuard } from '../../../usuarios/infrastructure/guards/roles.guard';
import { ExtraerDatosFormulaUseCase } from '../../application/use-cases/extraer-datos-formula.use-case';

// 10MB — igual al límite que valida el propio microservicio de OCR, no
// los 5MB de `VALIDADOR_ARCHIVO` en `solicitudes.controller.ts` (ese es
// para la receta ya definitiva, este es para la foto cruda a leer).
const VALIDADOR_ARCHIVO_FORMULA = new ParseFilePipeBuilder()
  .addFileTypeValidator({
    fileType: /^(image\/jpeg|image\/png|application\/pdf)$/,
  })
  .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
  .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST });

/** Módulo 1 (OCR) — lee fecha, IPS/farmacia y medicamentos de una foto
 * o PDF de fórmula médica, para precargar `nueva_solicitud_screen` y
 * que el Paciente solo tenga que corregir, no transcribir todo a mano.
 * No depende de que exista una solicitud todavía — por eso vive en su
 * propio controlador, no colgado de `/solicitudes/:id`. */
@Controller('formulas')
@UseFilters(DominioHttpFilter)
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles('PACIENTE')
export class FormulasController {
  constructor(private readonly extraerDatosFormula: ExtraerDatosFormulaUseCase) {}

  @Post('extraer')
  @UseInterceptors(FileInterceptor('archivo'))
  extraer(@UploadedFile(VALIDADOR_ARCHIVO_FORMULA) archivo: Express.Multer.File) {
    return this.extraerDatosFormula.execute(archivo.buffer, archivo.mimetype);
  }
}
