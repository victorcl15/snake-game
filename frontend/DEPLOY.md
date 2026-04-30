# 🚀 Guía de Despliegue - Snake Game 3D

## Opciones de Despliegue

### 1. Vercel (Recomendado) ⭐

**Ventajas**: 
- Gratis
- Deployments automáticos con Git
- Edge functions
- SSL incluido

**Pasos**:
```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Deploy desde la carpeta frontend
cd frontend
vercel

# 3. Responder preguntas
# ? Set up and deploy "...path"? (y/n) → y
# ? Which settings would you like to override? → nothing
# ? URL: vercel.com/tu-proyecto
```

**URL de producción**: `https://snake-game-3d.vercel.app`

---

### 2. Netlify

**Ventajas**:
- Gratis
- Build automático
- Serverless functions
- Analytics incluido

**Pasos**:
```bash
# 1. Instalar Netlify CLI
npm i -g netlify-cli

# 2. Deploy
cd frontend
netlify deploy --prod

# 3. Seleccionar directorio: dist
```

---

### 3. GitHub Pages

**Ventajas**:
- Totalmente gratis
- Integración con GitHub
- Historial de versiones

**Pasos**:
```bash
# 1. Añadir a vite.config.ts:
# base: '/snake-game/',

# 2. Build
npm run build

# 3. Deploy con gh-pages
npm install -D gh-pages

# Añadir scripts en package.json:
"deploy": "gh-pages -d dist"

# 4. Deploy
npm run deploy
```

---

### 4. Docker (Para servidor propio)

**Dockerfile**:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

**Build y run**:
```bash
docker build -t snake-game-3d .
docker run -p 3000:3000 snake-game-3d
```

---

### 5. AWS Amplify

**Pasos**:
```bash
# 1. Instalar Amplify CLI
npm i -g @aws-amplify/cli

# 2. Inicializar
amplify init

# 3. Añadir hosting
amplify add hosting

# 4. Publicar
amplify publish
```

---

## Optimizaciones Previas a Despliegue

### 1. Build Optimizado
```bash
npm run build

# Verificar tamaño
ls -lh dist/

# Analizar bundle
npm install -D rollup-plugin-visualizer
```

### 2. Verificar Variables de Entorno
```bash
# .env.production
VITE_API_URL=https://api.tu-dominio.com
VITE_SOCKET_URL=https://socket.tu-dominio.com
```

### 3. Compresión Gzip
```bash
# Verificar que gzip está habilitado en el servidor
# En Vercel y Netlify se hace automáticamente
```

### 4. Cache Headers
```bash
# En vercel.json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## Configuración de Dominio Personalizado

### Vercel
```bash
# Desde dashboard de Vercel
Settings → Domains → Add Custom Domain
# Configurar DNS con tu proveedor
```

### Netlify
```bash
# Desde dashboard de Netlify
Domain settings → Add custom domain
# Configurar DNS
```

---

## Monitoreo y Logging

### Sentry (Error Tracking)
```bash
npm install @sentry/react

# En main.tsx
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: "tu-sentry-dsn",
  environment: "production"
})
```

### Google Analytics
```bash
npm install react-ga4

# En main.tsx
import GA4 from 'react-ga4'
GA4.initialize('G-TU-ID')
```

---

## Checklist Final de Despliegue

- [ ] Ejecutar `npm run build` sin errores
- [ ] Ejecutar `npm run type-check` - OK
- [ ] Ejecutar `npm run lint` - OK
- [ ] Verificar variables de entorno
- [ ] Probar en `npm run preview` localmente
- [ ] Verificar performance con Lighthouse
- [ ] Probar en múltiples navegadores
- [ ] Probar en móvil
- [ ] Configurar dominio personalizado
- [ ] Configurar SSL/TLS
- [ ] Configurar CDN
- [ ] Hacer backup de base de datos
- [ ] Configurar monitoreo
- [ ] Configurar alertas

---

## Problemas Comunes

### Error: "Cannot find module '@babylonjs/core'"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### WebGL context lost
```bash
# Verificar en console
# Usualmente se recupera automáticamente
# Implementar fallback si es necesario
```

### Performance bajo en producción
```bash
# 1. Revisar Network tab en DevTools
# 2. Verificar tamaño de bundle
# 3. Habilitar compression
# 4. Usar CDN para assets
```

### Audio no funciona
```bash
# Algunos navegadores requieren https
# Verificar CORS headers
# Verificar permisos de audio
```

---

## Estadísticas de Despliegue

| Métrica | Valor |
|---------|-------|
| Bundle Size | 3-4 MB |
| Gzipped | 1-1.5 MB |
| Load Time | 2-3s (primera carga) |
| FPS | 55-60 |
| Memory | 80-120 MB |

---

## URLs de Ejemplo

| Servicio | URL |
|----------|-----|
| Vercel | `https://snake-game-3d.vercel.app` |
| Netlify | `https://snake-game-3d.netlify.app` |
| GitHub Pages | `https://username.github.io/snake-game` |
| AWS Amplify | `https://main.xxxxx.amplifyapp.com` |

---

## Soporte Post-Deploy

### Si algo falla:

1. **Revisar logs**
   ```bash
   # Vercel
   vercel logs
   
   # Netlify
   netlify logs:function
   ```

2. **Rollback**
   ```bash
   # Vercel
   vercel rollback
   ```

3. **Contactar soporte**
   - Vercel: https://vercel.com/support
   - Netlify: https://support.netlify.com

---

## Recursos Adicionales

- [Vite Deployment Guide](https://vitejs.dev/guide/deploy.html)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Performance Tips](https://web.dev/performance/)

---

**¡Listo para desplegar! 🚀**
