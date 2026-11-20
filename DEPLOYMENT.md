# Guía de Despliegue en Contenedores & Sitios Web (ReleaseHub Calendar)

Este proyecto es una aplicación web estándar basada en **React + Vite + TypeScript**. Puede alojarse gratuitamente en **GitHub Pages**, como sitio web estático corporativo, o desplegarse en contenedores **Docker / Kubernetes**.

---

## 0. 🐙 Despliegue Gratuito en GitHub Pages (Directo desde tu cuenta de GitHub)

Ya se ha configurado el archivo de automatización **`.github/workflows/deploy-pages.yml`**. Para que GitHub lo publique automáticamente como sitio web:

1. **Sube el código a tu repositorio de GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of ReleaseHub Calendar"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
   git push -u origin main
   ```

2. **Habilitar GitHub Pages en el repositorio:**
   - En tu repositorio de GitHub, ve a **Settings** (Configuración) > **Pages**.
   - En la sección **Build and deployment** > **Source**, selecciona: **GitHub Actions**.

¡Listo! Cada vez que hagas `git push`, GitHub compilará y publicará automáticamente tu aplicación en una URL como:  
👉 `https://TU-USUARIO.github.io/TU-REPOSITORIO/`

---

## 1. 🚀 Ejecución en Contenedor Docker (Con Persistencia en Servidor y Puerto 8081)

Se han incluido los archivos `Dockerfile` y `docker-compose.yml` preconfigurados en el puerto **`8081`** y con un volumen persistente (`./data:/app/data`) para que **todos los cambios, liberaciones y miembros se guarden directamente en el disco del servidor**.

### A. Instalación en un Servidor SIN Acceso a Internet (Offline / Air-Gapped)
⚠️ **Importante:** No descargues únicamente la imagen base `alpine` vacía, porque adentro del contenedor ya va compilada tu aplicación React y sus librerías. Debes construir la imagen completa en tu PC (que sí tiene internet), empaquetarla en un archivo `.tar` (igual que un `.zip`) y llevar ese archivo al servidor:

**Paso 1 (En tu PC con internet):** Construir y exportar la imagen lista a un archivo:
```bash
# 1. Construye la imagen final con toda la app adentro
docker build -t releasehub-calendar:latest .

# 2. Exporta la imagen completa a un archivo transportable (.tar)
docker save -o releasehub-offline.tar releasehub-calendar:latest
```

**Paso 2 (Mover al servidor sin internet):**
Copia únicamente estos **2 archivos** a una carpeta en tu servidor (por USB, SCP, WinSCP o carpeta compartida):
1. `releasehub-offline.tar`
2. `docker-compose.yml`

**Paso 3 (En el servidor sin internet):** Cargar la imagen y levantar el contenedor en el puerto `8081`:
```bash
# 1. Carga la imagen en el Docker del servidor (no requiere internet)
docker load -i releasehub-offline.tar

# 2. Levanta el contenedor con Docker Compose (sin --build)
docker compose up -d
```
La aplicación quedará corriendo en **`http://IP-DE-TU-SERVIDOR:8081`** y guardará todos los cambios en la carpeta `./data/releasehub-db.json` del servidor.

---

### B. Instalación en un Servidor CON Acceso a Internet
```bash
docker compose up -d --build
```
La aplicación quedará disponible inmediatamente en: `http://localhost:8081` (o la IP/dominio de tu servidor).

> **Cuenta API de ServiceNow (Opcional en Servidor):** Puedes configurar `SNOW_INSTANCE_URL`, `SNOW_USERNAME` y `SNOW_PASSWORD` en `docker-compose.yml` para que todo el equipo pueda escanear cambios (`CHG`) directamente desde el servidor sin escribir credenciales en el navegador, o ingresarlas temporalmente dentro de `+ Nueva Liberación > Escanear ServiceNow > Configurar Cuenta API`.

---

## 2. 🌐 Despliegue como Sitio Web Estático (Nginx, Apache, S3, Cloudflare, Vercel)

El proyecto genera un paquete web estándar HTML/CSS/JS estático.

```bash
# 1. Situarse en la carpeta raíz del proyecto (donde está package.json)
cd ruta/del/proyecto

# 2. Instalar dependencias
npm install

# 3. Compilar para producción (genera la carpeta /dist)
npm run build

# 4. Servir en producción localmente (opcional)
npm start
```
La carpeta generada `/dist` contiene todos los archivos estáticos listos para subirse a:
- **Servidor Nginx / Apache / IIS interno** de la empresa.
- **AWS S3 + CloudFront** o **Azure Blob Storage**.
- **Google Cloud Storage** o **Firebase Hosting**.
- **Cloudflare Pages / Vercel / Netlify**.

### Configuración para Nginx (SPA Routing)
Para evitar errores 404 al recargar la página, asegúrate de que Nginx redirija a `index.html`:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 3. ☁️ Despliegue en Kubernetes / OpenShift
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: releasehub-deployment
spec:
  replicas: 2
  selector:
    matchLabels:
      app: releasehub
  template:
    metadata:
      labels:
        app: releasehub
    spec:
      containers:
      - name: releasehub
        image: tu-registro-corporativo/releasehub-calendar:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: releasehub-service
spec:
  type: ClusterIP
  selector:
    app: releasehub
  ports:
  - port: 80
    targetPort: 80
```

---

## 4. 🔑 Google Calendar y Permisos Corporativos
Al ejecutarse en tu propio dominio corporativo (por ejemplo `https://releases.tuempresa.com`), puedes agregar ese dominio en la consola de Google Cloud (`Credenciales > Orígenes de JavaScript autorizados`) para que el botón de **"Sincronizar Google Calendar"** funcione directamente con las cuentas corporativas de tu empresa (`@tuempresa.com`).
