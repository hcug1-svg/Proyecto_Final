# Informe de seguridad, optimización y SOLID — StockFlow

## 1. Resumen de revisión

Se revisó el proyecto adjunto y se generó esta versión nueva, conservando las funcionalidades de productos, categorías, entradas, salidas, historial y panel general.

### Hallazgos principales

| Hallazgo en la versión anterior | Cambio en la versión nueva | Estado |
| --- | --- | --- |
| `mysql2` con avisos de seguridad (uno alto) detectados por npm | Actualizado a rama corregida `3.24.x`; lockfile renovado | Corregido según auditoría de dependencias |
| Todas las rutas y consultas SQL en `src/app.js` | Rutas, servicios, dominio y repositorios separados | Refactorizado |
| Sin cabeceras de seguridad explícitas | Helmet y Content-Security-Policy (CSP) | Incorporado |
| Sin límite de peticiones | 300 peticiones por IP cada 15 minutos a `/api` | Incorporado |
| Validación parcial de contenido/tamaño | Requiere JSON para escrituras y limita cuerpo a 32 KB | Incorporado |
| Puertos Docker publicados en todas las interfaces | Puertos del anfitrión limitados a `127.0.0.1` | Incorporado |
| Host HTTP sin restricción | Lista de hosts válidos para mitigar DNS rebinding | Incorporado |
| Proceso Docker ejecutado como root | Contenedor web ejecutado como usuario `node` | Incorporado |
| Doble consulta de productos durante búsquedas | Catálogo reutilizado en memoria para selectores | Optimizado |
| Sin login ni roles | No incorporado, pues requiere definir usuarios y credenciales | **Pendiente para producción** |

La auditoría posterior `npm audit --omit=dev --audit-level=low` reportó **0 vulnerabilidades conocidas** al momento de la generación. Esto verifica versiones de dependencias, no garantiza seguridad completa de la aplicación.

## 2. ¿Cómo cumple SOLID?

### S — Responsabilidad única

- `http/products.routes.js` interpreta HTTP.
- `services/product.service.js` decide qué acciones son válidas.
- `repositories/product.repository.js` ejecuta SQL.
- `domain/stock-policy.js` calcula existencias.

Cada módulo cambia por un motivo específico; se evita mezclar las responsabilidades en un controlador grande.

### O — Abierto/cerrado

Se puede añadir un repositorio alternativo, otra forma de almacenamiento o un nuevo caso de uso sin editar la lógica central de existencias. La composición de dependencias selecciona las implementaciones.

### L — Sustitución de Liskov

Los servicios reciben objetos que cumplen contratos, no dependen de que una clase herede de MySQL. En `tests/services.test.js`, los repositorios simulados sustituyen a los reales y la lógica de negocio sigue funcionando.

### I — Segregación de interfaces

Los contratos pequeños en `src/contracts.js` documentan qué métodos consume cada caso de uso: `StockPort`, `ProductCatalogPort`, `MovementReaderPort`, `MovementWriterPort`, etc. El servicio de movimientos no necesita acceder a métodos para editar categorías.

### D — Inversión de dependencias

Los servicios reciben sus repositorios y `unitOfWork` mediante constructor. `src/composition.js` arma las dependencias concretas. De ese modo, los módulos de negocio no importan `mysql2` ni Express.

## 3. Protección de existencias

El servicio valida datos antes de consultar MySQL. Para una salida:

1. `MysqlUnitOfWork` inicia una transacción.
2. El repositorio bloquea el producto con `SELECT ... FOR UPDATE`.
3. La política de dominio calcula la nueva existencia, rechazando valores negativos.
4. El repositorio actualiza el stock y registra el movimiento en la misma transacción.
5. Se hace `COMMIT`; ante cualquier error, `ROLLBACK`.

El patrón evita que dos retiros concurrentes lean simultáneamente la misma existencia sin coordinación. Para comprobar concurrencia real, ejecuta una prueba de integración contra un servidor MySQL en funcionamiento.

## 4. Pruebas de ejecución automatizadas

Ejecuta `npm ci` y luego `npm test`. La batería contiene pruebas de:

- Rutas HTTP reales de Express con datos de prueba inyectados.
- Respuestas de `/api/health`, frontend y listado de productos.
- Cabeceras CSP y `X-Content-Type-Options`; ausencia de `X-Powered-By`.
- Rechazo de encabezados `Host` no autorizados (403).
- Rechazo de contenido no JSON (415) y JSON inválido (400).
- Rechazo de solicitudes mayores que 32 KB (413).
- Límite de peticiones (429).
- Entrada válida y salida exacta de existencias.
- Rechazo de salida mayor que el stock, sin escribir movimientos.
- Alta de productos con movimiento inicial y categoría inexistente.
- Prohibición de eliminar una categoría en uso.
- Transacciones que revierten los cambios ante errores y liberan conexiones.
- SQL parametrizado, escape de caracteres comodín y validaciones de campos.

**Resultado al generar la entrega:** la batería automatizada pasó. Estas pruebas ejecutan el backend y usan dobles de acceso a datos; **no sustituyen** una prueba completa con MySQL real. La conexión real se puede verificar tras iniciar Docker mediante `/api/health`.

Para realizar una **prueba de ejecución real no destructiva** después de iniciar los contenedores, ejecuta `docker compose exec web npm run smoke`. La prueba solicita las cinco rutas principales y falla si la base de datos o la API no responde. No se pudo ejecutar aquí por no estar instalado Docker/MySQL en el entorno de generación.

## 5. Seguridad y límites de despliegue

Este sistema es un ejemplo académico para ejecutar **localmente**. Aunque se implementó hardening básico, no debe publicarse en Internet tal como está:

1. Falta autenticación y autorización por roles. Cualquier proceso con acceso al puerto local podría modificar inventario.
2. Las credenciales por defecto del `docker-compose.yml` son demostrativas. Deben sustituirse antes de usar datos reales.
3. HTTP en `localhost` no es HTTPS. Ante un despliegue externo, usa TLS y un proxy inverso confiable.
4. El limitador de peticiones utiliza memoria del proceso. Para múltiples instancias o uso público, usa un almacenamiento distribuido.
5. Configura copias de seguridad de MySQL, alertas, monitoreo, registros de cambios por usuario y controles operativos.
6. Ejecuta `npm audit` regularmente y actualiza el lockfile conforme se publiquen correcciones.

La aplicación **no expone errores internos SQL al cliente** y los datos de entrada se usan con parámetros, nunca concatenados directamente en valores SQL. La interfaz escapa texto procedente del usuario al generar HTML.

## 6. Mejoras de rendimiento

- Pool de conexiones MySQL reutilizable, con límites de cola y tiempos de conexión.
- Consultas de panel independientes ejecutadas concurrentemente mediante `Promise.all`.
- Menos peticiones de frontend al filtrar productos; selector y modal reutilizan el catálogo ya cargado.
- Compresión gzip de respuestas HTTP, cuando el cliente la negocia.
- Caché de archivos estáticos y modo `NODE_ENV=production` en Docker.
- Índices existentes en MySQL para SKU, categoría y movimientos por fecha/producto.
- Transacciones limitadas a operaciones que necesitan atomicidad.
