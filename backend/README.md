# Módulo Backend API & Base de Datos

Este directorio aloja el código central del servidor Node.js y maneja absolutamente todas las peticiones a la Base de Datos subyacente de SQLite3 (`db.sqlite`). Mantiene toda la lógica de negocio y permisos detrás de los end-points HTTP.

## 📁 Archivos Principales

### `index.js`
Es el archivo orquestador principal del Backend escrito utilizando Express. Aquí residen todas las reglas de negocio incluyendo:
- **CRUD General**: Creación, actualización y búsqueda de Work Items, Manejo de caché de memoria en búsquedas lentas (`searchCache`) para eficiencia.
- **Micro-Procesos**: Lógica de inserción de mini-tareas. Contiene el "Endpoint del Rechazo QA" (`/api/work-items/:id/qa-reject`) que procesa matemáticamente la deducción del porcentaje equitativo en los procesos del desarrollador.
- **Módulo de Reportes**: La ruta `/api/reports/daily-evidence` que emplea la librería `json2csv` para entregar hojas de cálculo y la ruta `/api/work-items/qa-ready` que utiliza agregadores SQL avanzados (`HAVING SUM`) para detonar las alarmas de listas de QA.
- **Gestión Multer**: Control transaccional y registro en sistema de archivos del `FileManager`.

### `database.js`
Archivo integrador de SQLite que sirve como "Migration Script" dinámico. Implementa una lógica (`addColumnIfNotExists`) que expande el esquema de la base de datos de manera nativa sin destruir información existente.
Tablas primarias que administra:
- `work_items` y `changes`
- `mini_tasks` (Nuevas notas de seguimiento de Dev & QA)
- `files` (Rastreo de metadatos de usuario y path de binarios)
- `users` (Validación de cuentas)

### `importAzure.js`
Este es un script para importar masivamente Work Items desde un proyecto de Azure DevOps. Por seguridad, su configuración no está en el código, sino que se carga desde variables de entorno.

## 💻 Inicio del Servidor

El backend corre por defecto en el puerto `3001` de la computadora local. Se ejecuta haciendo:
```bash
npm install
npm start
```

## 🔐 Integración con Azure DevOps

El script `importAzure.js` permite popular la base de datos local con datos de Azure DevOps. Para evitar exponer credenciales, el script utiliza variables de entorno.

### Configuración
1.  Cree un archivo `.env` en la raíz de la carpeta `/backend`.
2.  Agregue las siguientes variables al archivo `.env`:

    ```
    AZURE_DEVOPS_ORG=SuOrganizacion
    AZURE_DEVOPS_PROJECT=SuProyecto
    AZURE_DEVOPS_PAT=SuPersonalAccessToken
    ```

    - `AZURE_DEVOPS_ORG`: El nombre de su organización en Azure DevOps.
    - `AZURE_DEVOPS_PROJECT`: El nombre del proyecto de donde se importarán los Work Items.
    - `AZURE_DEVOPS_PAT`: Un Personal Access Token con permisos de lectura para los Work Items.

### Ejecución
Para correr la importación, ejecute el siguiente comando en la carpeta `/backend`:
```bash
node importAzure.js
```
El script se conectará a Azure DevOps, descargará los Work Items y los guardará en la base de datos de SQLite.
