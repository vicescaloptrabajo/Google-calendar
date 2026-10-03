# 📅 ReleaseHub Calendar

> Calendario corporativo y gestor de lanzamientos, ventanas de mantenimiento y despliegues con sincronización con Google Calendar, exportación .ICS y filtros avanzados.

---

## 🚀 Métodos de Instalación y Despliegue

Puedes ejecutar este proyecto mediante cualquiera de las siguientes 3 alternativas:

### 1️⃣ Método 1: Local con npm (Node.js)
```bash
# Instalar librerías
npm install

# Iniciar servidor de desarrollo
npm run dev

# O compilar e iniciar en producción
npm run build
npm start
```
👉 Disponible en: `http://localhost:3000`

---

### 2️⃣ Método 2: En Contenedor Docker (Producción / Servidor Propio)
```bash
# Iniciar con Docker Compose (Nginx optimizado)
docker compose up -d --build
```
👉 Disponible en: `http://localhost:8080`

---

### 3️⃣ Método 3: En la Nube con GitHub Pages (Automático y Gratuito)
El repositorio incluye el flujo de **GitHub Actions** en `.github/workflows/deploy-pages.yml`.
1. Sube el código a tu repositorio con `git push`.
2. Ve a **Settings > Pages** en GitHub y selecciona **GitHub Actions** en la fuente de despliegue.
👉 Tu aplicación se publicará en: `https://TU-USUARIO.github.io/TU-REPOSITORIO/`

---

📖 **Para ver la guía paso a paso detallada con todos los comandos y soluciones a dudas, consulta el archivo [GUIA_INSTALACION.md](GUIA_INSTALACION.md).**
