# integrantes del proyecto
  Hector Javier Cu Garcia
  Rodrigo Alejandro Cuetto Lusky
  Jonathan Josue Ixpanel Panjoj
  Luis Estuardo Pineda Reyes
# StockFlow — Sistema de Gestión de Inventario

Proyecto final completo desarrollado con **Node.js + Express 5 (API REST), MySQL 8, HTML, JavaScript puro y Bootstrap 5**. Esta versión fue refactorizada con **SOLID, inyección de dependencias, servicios y repositorios**, además de controles de seguridad y pruebas de ejecución.

Lee también **`SEGURIDAD_Y_SOLID.md`** para conocer la arquitectura, los controles implementados y los riesgos que aún requieren atención antes de publicar el sistema.

## Forma más fácil: ejecutar con Docker

**Necesitas instalar Docker Desktop** (Windows/macOS) o Docker Engine + Compose (Linux) y asegurarte de que esté abierto.

1. Descomprime `Inventario_Proyecto_Final_SOLID_Seguro.zip`.
2. Abre una terminal en la carpeta `inventario-final` (la que contiene `docker-compose.yml`).
3. Ejecuta:

   ```bash
   docker compose up --build -d
   ```

4. Espera 30 a 90 segundos la primera vez y abre **http://localhost:3000**.

**En Windows:** también puedes hacer doble clic en `INICIAR-WINDOWS.bat` después de descomprimir y abrir Docker Desktop. El archivo ejecuta el comando y abre la página automáticamente.

Docker descarga Node.js y MySQL, crea automáticamente la base `inventario_db`, sus tablas, los datos de ejemplo e inicia la aplicación. **No necesitas importar SQL manualmente con esta opción.**

Para ver los registros del backend:

```bash
docker compose logs -f web
```

Para comprobar que las cinco rutas principales funcionan **contra MySQL real**:

```bash
docker compose exec web npm run smoke
```

Para detener sin borrar los datos:

```bash
docker compose down
```

Los datos se guardan en el volumen `mysql_data` y siguen ahí al reiniciar. **No ejecutes `docker compose down -v` si quieres conservarlos.**

> **Seguridad:** el servidor web (3000) y MySQL (3307) se publican exclusivamente en `127.0.0.1` del equipo anfitrión. Las contraseñas de Docker son **solo para desarrollo**: usuario `inventario_user`, clave `inventario_dev_123`. Cámbialas antes de usar datos reales, definiendo `DOCKER_MYSQL_USER`, `DOCKER_MYSQL_PASSWORD` y `DOCKER_MYSQL_ROOT_PASSWORD` antes del primer arranque. Para una base que ya existe, cambiar las variables no modifica usuarios existentes automáticamente.

##  Alternativa sin Docker: Node.js y MySQL instalados

1. Instala **Node.js 20 o superior** y **MySQL 8** (Workbench es opcional).
2. En la carpeta `inventario-final`, copia `.env.example` como `.env`.
3. Abre `.env` y escribe el usuario y contraseña reales de tu MySQL local. Por ejemplo, `MYSQL_HOST=127.0.0.1`, `MYSQL_PORT=3306`, `MYSQL_USER=root` y `MYSQL_PASSWORD=tu_clave`.
4. Ejecuta estos comandos por orden:

   ```bash
   npm install
   npm run db:init
   npm run db:seed
   npm start
   ```

5. Abre **http://localhost:3000**.

**Nota:** El usuario de MySQL usado para `db:init` debe tener permiso para crear la base de datos. Si no tiene permiso, crea `inventario_db` desde MySQL Workbench con un administrador y otorga los permisos necesarios.

Para desarrollo puedes usar `npm run dev` en vez de `npm start` (reinicia el servidor al cambiar código).

##  Funciones incluidas

| Módulo | Funcionalidades |
| --- | --- |
| Panel general | Número de productos, categorías, unidades, alertas de stock bajo, valor estimado, movimientos recientes |
| Productos | Crear, listar, buscar, filtrar por categoría, editar y archivar productos; SKU único, precio y stock mínimo |
| Categorías | Crear, listar, editar y eliminar categorías sin productos asociados |
| Movimientos | Registrar entradas y salidas, consultar historial, filtrar por producto y tipo, observaciones y fecha |
| Validaciones | Datos obligatorios, precios, cantidades enteras, SKU, relaciones con categorías, stock no negativo |

Al crear un producto se puede especificar un **stock inicial**: el sistema lo registra automáticamente como movimiento de entrada. Al editar un producto, las existencias **no se editan directamente**, sino mediante movimientos para mantener una auditoría.

Al eliminar un producto se **archiva** en vez de borrarlo físicamente. Esto preserva su historial de entradas y salidas. Los productos archivados ya no aparecen en el catálogo ni permiten movimientos nuevos.

### Regla de negocio principal

**Una salida no puede exceder la existencia actual.** El backend abre una transacción de MySQL y bloquea la fila del producto con `SELECT ... FOR UPDATE` hasta terminar el registro. Así dos salidas simultáneas no pueden generar existencias negativas.

Ejemplo: si hay 5 unidades y se solicita salida de 8, la API responde `409 Conflict` y conserva las 5 unidades.

##  Base de datos MySQL

El proyecto ya incluye los archivos:

- `db/schema.sql`: crea la base y las tres tablas con claves primarias/foráneas.
- `db/seed.sql`: datos de demostración de categorías, productos y movimientos. Es idempotente: no duplica las entradas iniciales al ejecutarse otra vez.

Relaciones:

```text
categorias (1) ── (N) productos (1) ── (N) movimientos
```

**Tablas:**

- `categorias`: id, nombre, descripción, fecha.
- `productos`: id, SKU, nombre, descripción, categoría, precio, existencia, stock mínimo, activo, fechas.
- `movimientos`: id, producto, tipo ENTRADA/SALIDA, cantidad, observación, fecha.

Los precios y el valor del inventario se presentan en **quetzales (GTQ)**; esto se puede adaptar a otra moneda en `public/app.js`.

##  Rutas de la API REST

| Método | Ruta | Acción |
| --- | --- | --- |
| GET | `/api/health` | Estado de la conexión |
| GET | `/api/dashboard` | Indicadores y últimos movimientos |
| GET | `/api/categorias` | Listar categorías |
| POST | `/api/categorias` | Crear categoría |
| PUT | `/api/categorias/:id` | Actualizar categoría |
| DELETE | `/api/categorias/:id` | Eliminar categoría sin productos |
| GET | `/api/productos` | Listar y filtrar (`q`, `categoria_id`, `stock_bajo=1`) |
| GET | `/api/productos/:id` | Consultar producto |
| POST | `/api/productos` | Crear producto (`stock_inicial` opcional) |
| PUT | `/api/productos/:id` | Actualizar producto (excepto stock) |
| DELETE | `/api/productos/:id` | Archivar producto |
| GET | `/api/movimientos` | Listar (`producto_id`, `tipo`, `limite`) |
| POST | `/api/movimientos` | Registrar entrada o salida |

Ejemplo de una salida con `fetch`:

```js
fetch('http://localhost:3000/api/movimientos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    producto_id: 1,
    tipo: 'SALIDA',
    cantidad: 2,
    observacion: 'Venta en mostrador'
  })
}).then(r => r.json()).then(console.log);
```

## Verificación y seguridad

```bash
npm test                # pruebas automatizadas de servicios, API, seguridad y validación
npm run check           # revisión de sintaxis de los archivos JavaScript
npm audit --omit=dev    # auditoría de vulnerabilidades conocidas de dependencias
npm run smoke           # prueba no destructiva contra la API y MySQL en ejecución
```

Las pruebas HTTP ejecutan Express con repositorios simulados, sin requerir MySQL. La **ejecución integral contra un MySQL real debe comprobarse** en tu computadora con Docker o MySQL instalado. Con el sistema iniciado, entra a `http://localhost:3000/api/health` para confirmar la conexión real.

El backend incorpora Helmet con una política CSP, validación estricta de JSON, máximo de 32 KB por solicitud, limitación de peticiones, lista de hosts permitidos (`ALLOWED_HOSTS`), sentencias SQL parametrizadas, transacciones, compresión HTTP, cierre correcto de conexiones y logs sin detalles internos para el cliente.

**Límite importante:** no incluye inicio de sesión ni permisos por usuario. Está pensado para un proyecto académico ejecutado localmente; **no debe exponerse directamente a Internet** sin agregar autenticación, autorización, HTTPS y gestión de secretos.

##  Arquitectura SOLID

| Capa | Responsabilidad |
| --- | --- |
| `src/http/` | Traduce solicitudes HTTP a llamadas de servicios; centraliza errores |
| `src/services/` | Reglas y casos de uso (productos, categorías, movimientos y dashboard) |
| `src/domain/` | Reglas de inventario sin SQL ni Express |
| `src/repositories/` | Consultas MySQL parametrizadas |
| `src/infra/` | Pool MySQL y manejo de transacciones |
| `src/composition.js` | Ensambla repositorios y servicios mediante inyección de dependencias |

Los cinco principios SOLID se explican con ejemplos en `SEGURIDAD_Y_SOLID.md`.

## Estructura

```text
inventario-final/
├── db/
│   ├── schema.sql
│   └── seed.sql
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── scripts/
│   ├── database.js
│   ├── check-syntax.js
│   └── smoke.js
├── src/
│   ├── app.js
│   ├── composition.js
│   ├── contracts.js
│   ├── errors.js
│   ├── server.js
│   ├── validation.js
│   ├── domain/stock-policy.js
│   ├── http/ (rutas y manejo de errores)
│   ├── services/ (casos de uso)
│   ├── repositories/ (acceso MySQL)
│   └── infra/database.js
├── tests/
│   ├── http.test.js
│   ├── services.test.js
│   └── validation.test.js
├── .env.example
├── INICIAR-WINDOWS.bat
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
├── SEGURIDAD_Y_SOLID.md
└── README.md
```

### Importante

Este es un **proyecto académico local**. Aunque se reforzó la seguridad, ninguna auditoría automatizada garantiza que no existan vulnerabilidades. Si lo despliegas para terceros, incluye autenticación, autorización, TLS, respaldo de datos y registro de auditoría administrativo.
