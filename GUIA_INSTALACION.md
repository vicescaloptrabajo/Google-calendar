# 📘 Guía Completa de Instalación y Despliegue: ReleaseHub Calendar

Esta guía detalla los **3 métodos disponibles** para ejecutar y desplegar la aplicación:
1. **Método 1: Ejecución local con Node.js & npm** (Desarrollo y Servidor local)
2. **Método 2: Ejecución en Contenedor Docker** (Servidores corporativos / On-Premise)
3. **Método 3: Despliegue en la Nube con GitHub Pages** (Gratis y automático)

---

## 📌 Requisitos Previos Generales

- **Git** instalado en tu computadora ([Descargar Git](https://git-scm.com/)).
- Para el **Método 1**: **Node.js** v20 o superior ([Descargar Node.js LTS](https://nodejs.org/)).
- Para el **Método 2**: **Docker** y **Docker Compose** ([Descargar Docker Desktop](https://www.docker.com/)).
- Para el **Método 3**: Una cuenta en [GitHub.com](https://github.com/).

---

## 🚀 Método 1: Ejecución Local con Node.js & npm

Este método es ideal para probar la aplicación en tu computadora, realizar cambios en el código o ejecutarlo en un servidor propio con Node.js.

### Paso 1: Abrir la terminal en la raíz del proyecto
Abre tu terminal (PowerShell, Command Prompt o Bash) y dirígete a la carpeta donde se encuentra el archivo `package.json`:
```bash
cd /ruta/hacia/tu/proyecto
```

### Paso 2: Instalar las dependencias
Descarga las librerías necesarias del proyecto:
```bash
npm install
```
*(Nota: Si alguna vez tuvieras advertencias de dependencias en máquinas antiguas, puedes usar `npm install --legacy-peer-deps`).*

### Paso 3A: Modo Desarrollo (con recarga en vivo)
Si vas a realizar cambios y quieres ver las actualizaciones en tiempo real:
```bash
npm run dev
```
👉 Abre tu navegador en: `http://localhost:3000`

### Paso 3B: Modo Producción (Compilación optimizada)
Si deseas generar la versión final lista para producción:
```bash
# Compilar el código (crea la carpeta optimizada /dist)
npm run build

# Iniciar el servidor local de producción
npm start
```
👉 Abre tu navegador en: `http://localhost:3000`

---

## 🐳 Método 2: Ejecución en Contenedores con Docker

Este método es el más recomendado para empresas, servidores Linux/Windows internos, Kubernetes o entornos aislados sin necesidad de tener Node.js instalado en la máquina anfitriona.

El proyecto ya incluye un `Dockerfile` optimizado con servidor web **Nginx** y `docker-compose.yml`.

### Opción A: Usando Docker Compose (Recomendado - 1 Solo Comando)
Desde la carpeta raíz del proyecto, ejecuta:
```bash
docker compose up -d --build
```
- `-d`: Ejecuta el contenedor en segundo plano (background).
- `--build`: Compila la imagen con los últimos cambios del código.

👉 Abre tu navegador en: **`http://localhost:8080`**

#### Comandos útiles para Docker Compose:
```bash
# Ver los logs del contenedor:
docker compose logs -f

# Detener el contenedor:
docker compose down

# Reiniciar el contenedor:
docker compose restart
```

---

### Opción B: Usando comandos estándar de Docker CLI
Si no utilizas Docker Compose, puedes construir y correr la imagen manualmente:

```bash
# 1. Construir la imagen Docker:
docker build -t releasehub-calendar:latest .

# 2. Correr el contenedor en el puerto 8080:
docker run -d -p 8080:80 --name releasehub releasehub-calendar:latest
```

👉 Abre tu navegador en: **`http://localhost:8080`**

---

## 🐙 Método 3: Despliegue Automático en GitHub Pages (Nube Gratuita)

Este método aloja tu aplicación en los servidores de GitHub con certificado SSL (HTTPS) gratuito. Cada vez que hagas `git push`, GitHub se encarga de compilar y actualizar el sitio web automáticamente.

### Paso 1: Inicializar y subir el código a GitHub
En la terminal de tu proyecto:
```bash
# 1. Inicializar repositorio (si aún no lo has hecho)
git init

# 2. Agregar todos los archivos
git add .

# 3. Guardar el commit
git commit -m "feat: ReleaseHub Calendar inicial"

# 4. Establecer la rama principal
git branch -M main

# 5. Conectar con tu repositorio en GitHub (reemplaza con tu URL real)
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git

# 6. Subir el código
git push -u origin main
```

### Paso 2: Activar GitHub Actions en la configuración de Pages
1. Entra a tu repositorio en **GitHub.com** desde tu navegador.
2. Haz clic en la pestaña **Settings** (Configuración) arriba a la derecha.
3. En la barra lateral izquierda, haz clic en **Pages**.
4. En la sección **Build and deployment** > **Source**, despliega el selector y elige:  
   👉 **GitHub Actions**.
5. No tienes que configurar nada más: el archivo `.github/workflows/deploy-pages.yml` incluido en el proyecto comenzará a ejecutarse inmediatamente.

### Paso 3: Acceder a tu sitio web
En la pestaña **Actions** verás el progreso de la tarea en color verde ✅. Una vez completado, tu aplicación estará disponible públicamente en:

👉 **`https://TU-USUARIO.github.io/TU-REPOSITORIO/`**

---

## 📊 Tabla Comparativa de Métodos

| Característica | Método 1: npm | Método 2: Docker | Método 3: GitHub Pages |
| :--- | :--- | :--- | :--- |
| **Dónde corre** | Tu PC / Servidor Node.js | Servidor / Contenedor local o nube | Servidores globales de GitHub |
| **Requiere instalar** | Node.js + npm | Docker Desktop | Solo Git y navegador |
| **Ideal para** | Desarrollo diario | Infraestructura corporativa / DevOps | Compartir con el equipo sin servidores |
| **Acceso** | `localhost:3000` | `localhost:8080` (o IP del servidor) | URL pública HTTPS (`.github.io`) |
| **Costo** | Gratis | Gratis | Gratis |

---

## 💡 Solución a Dudas Frecuentes

- **¿Puedo cambiar de método cuando quiera?**  
  Sí, los tres métodos son 100% compatibles y utilizan exactamente los mismos archivos fuente.
- **¿Qué pasa si modifico un archivo en el código?**  
  - En npm (`dev`): Se actualiza al instante en el navegador.
  - En Docker: Ejecutas `docker compose up -d --build` para reconstruir la imagen.
  - En GitHub: Haces `git add . && git commit -m "update" && git push` y GitHub lo publica solo.
