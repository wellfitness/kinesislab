# Publicar KinesisLab en Google Play Store via TWA

## Requisitos previos

- Cuenta de desarrollador en Google Play Console ($25 una vez)
- La PWA desplegada en `https://kinesislab.movimientofuncional.app/`
- Certificado de firma (se genera durante el proceso)

---

## Opción A: PWABuilder (recomendada, sin instalar nada)

### 1. Generar el paquete Android

1. Ir a **https://www.pwabuilder.com/**
2. Introducir la URL: `https://kinesislab.movimientofuncional.app/`
3. Esperar el análisis de la PWA
4. Click en **"Package for stores"** > **Android**
5. Configurar:
   - **Package ID**: `app.movimientofuncional.kinesislab`
   - **App name**: `KinesisLab`
   - **Signing key**: Generar nuevo (guardar el keystore de forma segura)
   - **Display mode**: Standalone
   - **Status bar color**: `#111827`
   - **Nav bar color**: `#111827`
6. Descargar el paquete (incluye el AAB + keystore)

### 2. Configurar Digital Asset Links

Una vez generado el paquete, PWABuilder te dará el **SHA-256 fingerprint** del certificado.

1. Copiar el fingerprint
2. Editar `.well-known/assetlinks.json` y reemplazar `__SHA256_FINGERPRINT_AQUI__` con el fingerprint real
3. Hacer deploy del archivo en el servidor

**Verificar que funciona:**
```
https://kinesislab.movimientofuncional.app/.well-known/assetlinks.json
```

### 3. Subir a Google Play Console

1. Ir a **https://play.google.com/console/**
2. Crear nueva app:
   - **Nombre**: KinesisLab: Entrenamiento Cognitivo-Motor
   - **Idioma**: Español (España)
   - **Tipo**: Aplicación
   - **Categoría**: Salud y bienestar
3. Completar la ficha de Play Store:
   - **Descripción corta** (80 chars): Herramientas de entrenamiento cognitivo-motor para prevención de caídas.
   - **Descripción completa**: (ver abajo)
   - **Icono**: `assets/icon-512.png`
   - **Screenshots**: Capturas de móvil (1080x1920 o similar)
   - **Gráfico de funciones** (1024x500): `assets/kinesislab_hero.png`
4. En **Producción** > **Crear versión** > Subir el archivo `.aab`
5. Rellenar las declaraciones de contenido y privacidad
6. Enviar para revisión

---

## Opción B: Bubblewrap (local, requiere JDK + Android SDK)

### Requisitos

```bash
# Instalar JDK (17 o superior)
# Instalar Android SDK (via Android Studio o command-line tools)

# Instalar Bubblewrap
npm install -g @nicedoc/bubblewrap
```

### Generar el proyecto

```bash
bubblewrap init --manifest=https://kinesislab.movimientofuncional.app/manifest.json
bubblewrap build
```

Esto genera un `.aab` (Android App Bundle) listo para Play Store.

---

## Descripción completa para Play Store

```
KinesisLab es una colección gratuita y open source de herramientas interactivas 
de entrenamiento cognitivo-motor, diseñadas para profesionales del ejercicio y 
la salud.

CARACTERÍSTICAS PRINCIPALES:

• 21+ herramientas de entrenamiento cognitivo-motor
• Temporizadores profesionales (EMOM, Intervalos, AMRAP, AFAP)
• Tests cognitivos validados (Stroop, Go/No-Go, N-Back, Simon)
• Herramientas reactivas con estímulos visuales y auditivos
• Funciona sin conexión a internet (modo offline)
• Sin registro ni datos personales requeridos

DOMINIOS COGNITIVOS QUE ENTRENA:

• Función ejecutiva e inhibición
• Memoria de trabajo y secuencial
• Tiempo de reacción y procesamiento
• Atención sostenida y selectiva
• Coordinación cognitivo-motora

BASADO EN EVIDENCIA CIENTÍFICA:

Las herramientas están fundamentadas en investigación sobre neuroplasticidad,
prevención de caídas y envejecimiento activo. Diseñado para uso en sesiones
de entrenamiento personal y grupal.

PROFESIONALES QUE LO USAN:

• Entrenadores personales y de grupo
• Fisioterapeutas
• Terapeutas ocupacionales
• Profesionales de la actividad física adaptada

Desarrollado por Movimiento Funcional.
```

---

## Checklist de publicación

- [ ] PWA pasa Lighthouse 100% en PWA
- [ ] `assetlinks.json` desplegado y verificable
- [ ] Screenshots de móvil reales (mínimo 2, formato vertical)
- [ ] Gráfico de funciones (1024x500)
- [ ] Política de privacidad URL (obligatorio en Play Store)
- [ ] AAB generado y firmado
- [ ] Ficha de Play Store completada
- [ ] Declaración de contenido y datos rellenada
