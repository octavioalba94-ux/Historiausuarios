# 📘 Guía de Estudio General: Tabulador de Cambios

## 🚀 1. Concepto Global
El **Tabulador de Cambios** es un ecosistema Full-Stack diseñado para centralizar la gestión técnica de software. Su objetivo primordial es el **control de calidad colaborativo**, permitiendo que los desarrolladores reporten avances técnicos y los QAs (Quality Assurance) verifiquen el cumplimiento antes de una aprobación oficial (VoBo).

---

## 📂 2. Estructura de Carpetas (Mapa del Proyecto)

```text
/tabulador-de-cambios
├── /backend                # (API REST & Base de Datos)
│   ├── /uploads            # Archivos binarios (Evidencias, PDFs, Imágenes)
│   ├── database.js         # Configuración de SQLite y Migraciones
│   ├── index.js            # Lógica central, Endpoints y Reglas de Negocio
│   ├── package.json        # Dependencias (Express, Multer, sqlite3)
│   └── db.sqlite           # Base de Datos relacional local
│
└── /frontend               # (Interfaz de Usuario React)
    ├── /public             # Assets públicos y index.html
    └── /src                # Código fuente de React
        ├── /components     # UI Reutilizable (Vistas, Modales, Tablas)
        ├── App.js          # Orquestador visual (Rutas, Login, Temas)
        ├── index.js        # Punto de entrada de React
        └── theme.js        # Estilos globales y personalización (MUI)
```

### 🔍 Detalles de Carpetas Clave:
- **`backend/uploads`**: Importante. Aquí se guardan físicamente los archivos subidos. El código usa `multer` para procesarlos.
- **`frontend/src/components`**: Aquí vive la "inteligencia" visual. Cada archivo `.js` es un bloque de construcción (ej: un modal o una tabla).

---

## 🏗️ 3. Apartados y Secciones Funcionales

La aplicación se divide lógicamente en estas secciones que debes conocer para estudiar su arquitectura:

### A. Dashboard de Control (WorkItemManagement)
Es la pantalla principal. Su función es listar todos los ítems y permitir filtros rápidos.
- **Lógica Clave**: Renderiza el panel "Listo para QA" solo si detecta que hay ítems con Dev = 100% pero QA < 100%.

### B. Detalles del Item (WorkItemDetails)
Es el motor del flujo de trabajo. Aquí se fracciona el progreso en dos pestañas:
1.  **Pestaña Desarrollo (Dev)**: Registra micro-tareas (notas con porcentaje).
2.  **Pestaña Calidad (QA)**: Solo se activa cuando el progreso de Dev es exactamente 100%.

### C. Sistema de Evidencias (FileManager)
Permite subir archivos técnicos. Identifica quién sube cada archivo usando el estado del usuario logueado (`loggedInUser`).

### D. Administración (UserManagement & VoboList)
Vistas exclusivas para el rol `admin`. Permiten crear usuarios, cambiar roles y ver el historial de ítems finalizados.

---

## ⚙️ 4. Análisis de Lógica y Conexiones (Backend -> DB)

Para estudiar el funcionamiento interno, observa cómo se conectan las piezas:

### 📡 Comunicación Frontend-Backend
El frontend usa el comando `fetch` para pedir datos al backend.
> **Ejemplo**: `fetch('http://localhost:3001/api/work-items')` -> Esta línea conecta ambos mundos.

### 💾 Base de Datos (SQLite)
Se define en `backend/database.js`. La tabla más importante es `mini_tasks`, que guarda cada bit de progreso:
- `work_item_id`: Relación con la tarea padre.
- `tipo`: Define si es avance de 'desarrollo' o 'qa'.
- `porcentaje`: El valor numérico acumulable.

### 🧠 Lógica de Algoritmo: "Deducción por Error"
Cuando QA rechaza una tarea, el backend ejecuta este proceso:
1.  Busca todas las notas de desarrollo de esa tarea.
2.  Resta un porcentaje equitativo a cada una para bajar el total del 100%.
3.  Crea una nota de registro explicando el motivo del rechazo.

```javascript
// Fragmento de lógica en backend/index.js
app.post('/api/work-items/:id/qa-reject', (req, res) => {
    // 1. Identifica las tareas a penalizar
    db.all("SELECT * FROM mini_tasks WHERE work_item_id = ?", [id], (err, rows) => {
        // 2. Ejecuta la resta de porcentajes
        rows.forEach(row => {
            const newPercentage = row.porcentaje - deduction;
            db.run('UPDATE mini_tasks SET porcentaje = ? WHERE id = ?', [newPercentage, row.id]);
        });
    });
});
```

---

## 🎓 5. Guía Paso a Paso del Flujo (Study Path)

Para entender cómo funciona el sistema de principio a fin, sigue este camino:

1.  **Ingreso**: El usuario se autentica en `LoginPage.js`. `App.js` guarda sus datos en `loggedInUser`.
2.  **Registro**: Se crea un Work Item. Se guarda en la tabla `work_items` de SQLite.
3.  **Desarrollo**: El programador añade mini-tareas. El backend suma los porcentajes. Si llega a 100, el estado visual cambia.
4.  **Calidad**: El QA ve la tarea en su panel especial (`QaProgressPanel`). Si todo está bien, suma su propio 100%.
5.  **VoBo**: El administrador revisa (`VoboManagement`), adjunta el documento final y marca la tarea como `Completed`.

---

## 🔐 Seguridad y Manejo de Credenciales
Es de vital importancia no subir credenciales, tokens o cualquier tipo de dato sensible al repositorio de código. En este proyecto, la integración con servicios externos como Azure DevOps se maneja de forma segura utilizando variables de entorno.

En el backend, se utiliza un archivo `.env` para almacenar estas variables. Este archivo no debe ser subido al repositorio. Para más detalles sobre cómo configurar las variables de entorno para la integración con Azure DevOps, consulte la documentación en `backend/README.md`.

## 🛠️ Comandos de Mantenimiento
- **Instalación**: `npm install` en ambas carpetas.
- **Limpieza**: El archivo `backend/cleanup-duplicates.js` ayuda a mantener la base de datos sana eliminando registros duplicados accidentalmente durante pruebas de desarrollo.
