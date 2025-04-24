# ---- Etapa de Construcción (Builder) ----
# Usa una imagen base de Node.js (versión LTS Alpine es ligera).
# 'as builder' le da un nombre a esta etapa.
FROM node:23-alpine3.20 as builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia package.json y package-lock.json (o yarn.lock)
COPY package*.json ./

# Instala las dependencias (npm ci es generalmente preferido en CI/CD para usar package-lock.json)
RUN npm ci

# Copia el resto del código de la aplicación
COPY . .

# Establece el entorno a producción para la construcción de Next.js
ENV NODE_ENV=production

# Construye la aplicación Next.js para producción
# Reemplaza 'build' si tu script de build se llama diferente en package.json
RUN npm run dev

# ---- Etapa de Producción ----
# Usa una imagen base ligera de Node.js para ejecutar la aplicación construida.
FROM node:23-alpine3.20

# Establece el directorio de trabajo
WORKDIR /app

# Establece el entorno a producción para la ejecución
ENV NODE_ENV=production

# Copia las dependencias de producción desde la etapa de construcción
# Si usas 'output: standalone' en next.config.js, este paso puede variar.
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

# Copia los artefactos de construcción de Next.js desde la etapa de construcción
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

# Expone el puerto en el que Next.js se ejecutará (por defecto 3000)
EXPOSE 3000

# Comando para iniciar la aplicación Next.js en modo producción
# Reemplaza 'start' si tu script de inicio se llama diferente en package.json
CMD ["npm", "run", "dev"]