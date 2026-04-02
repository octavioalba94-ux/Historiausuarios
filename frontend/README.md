# Módulo Frontend React (SPA)

Este directorio conforma toda la capa visual construida utilizando la librería **React** complementada fuertemente con la suite de diseño moderna interactiva de **Material-UI (MUI)**.

## 🧩 Componentes Modulares (`/src/components/`)

El diseño de este cliente fue estrictamente partido en diferentes componentes acoplables para facilitar su análisis y escalado. Aquí están en su orden jerárquico:

### 1. Tableros y Panel Principal
- **`App.js`**: El corazón del engranaje visual. Carga la seguridad del inicio de sesión (Login View), detecta el Rol del perfil conectado y mantiene en memoria la lista en vivo de los Proyectos.
- **`WorkItemManagement.js`**: Creado para sustituir una vista saturada anterior. Este componente orquesta todo el "Dashboard" principal. Posee un estado interactivo para buscar IDs o textos. **Nota Importante:** Este archivo rastrea métricas para dibujar el Tablero Púrpura inteligente de "Tareas Listas para QA", un panel que permanece escondido hasta que el Admin o cuenta QA ingresan.
- **`Toolbar.js`**: Recuadro superior izquierdo de comandos. Aloja y exporta variables como los filtros, y lanza herramientas independientes.

### 2. Lógica de Flujo (El Modelo Dev vs QA)
- **`WorkItemDetails.js`**: El archivo más complejo a nivel lógico. Recibe un modal de edición general, y fracciona la visión real del progreso en Base Pestañas (`Tab`).
  - **Lógica de Bloqueo**: Oculta funcionalidades de QA impidiendo el avance hasta que Desarrollo logra el 100%. 
  - Renderiza los botones y formularios condicionalmente asegurándose que el rol y la pestaña elegida coincidan.

### 3. Reportes y Archivos Externos
- **`ReportModal.js`**: Pequeño componente aislado, el interceptor para el requerimiento de CSV. Configurado a detalle para filtrar métricas de Backend usando URIs incrustadas de Timestamp `Date.now()` para destruir la memoria en caché y descargar reportes siempre en tiempo real.
- **`FileManager.js`**: Un contenedor gráfico que se incrusta dentro de los *Work Items* leyendo el usuario conectado para identificar qué persona sube una pieza de evidencia fotográfica o técnica al disco duro. También incluye privilegios condicionados (Solo el rol de `admin` verá el bote de basura aquí).

### 4. Paneles Genéricos
- **`WorkItemTable.js`**: Una renderización repetitiva limpia para estructurar la clásica lista final azul.

## 💻 Comandos
Para iniciar esta capa en el Puerto `3000` predeterminado:
```bash
npm install
npm start
```
