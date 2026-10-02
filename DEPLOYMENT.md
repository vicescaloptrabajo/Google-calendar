# Guía de Despliegue en Contenedores & Sitios Web (ReleaseHub Calendar)

Este proyecto es una aplicación web estándar basada en **React + Vite + TypeScript**. Puede alojarse como sitio web estático o desplegarse en cualquier entorno de contenedores (Docker, Kubernetes, AWS, GCP, Azure o infraestructura On-Premise).

---

## 1. 🚀 Ejecución en Contenedor Docker (Recomendado para Empresas)

Se han incluido los archivos `Dockerfile` y `docker-compose.yml` preconfigurados para producción usando Nginx ligero optimizado.

### Opción A: Usando Docker Compose (1 solo comando)
```bash
docker compose up -d --build
```
La aplicación quedará disponible inmediatamente en: `http://localhost:8080` (o la IP/dominio de tu servidor).

### Opción B: Usando Docker CLI directamente
```bash
# 1. Construir la imagen
docker build -t releasehub-calendar:latest .

# 2. Correr el contenedor en el puerto 80 (o 8080)
docker run -d -p 8080:80 --name releasehub releasehub-calendar:latest
```

---

## 2. 🌐 Despliegue como Sitio Web Estático (Nginx, Apache, S3, Cloudflare, Vercel)

El proyecto genera un paquete web estándar HTML/CSS/JS estático.

```bash
# Instalar dependencias y compilar
npm install
npm run build
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
