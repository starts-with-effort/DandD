# ---- Etapa de Construcción (Builder) ----
# Usa una imagen base de Node.js (versión LTS Alpine es ligera).
# 'as builder' le da un nombre a esta etapa.
FROM node:23-alpine3.20 as builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia package.json y package-lock.json (o yarn.lock)
COPY package*.json ./

# Instala las dependencias (npm ci es generalmente preferido en CI/CD para usar package-lock.json)
RUN npm install

# Copia el resto del código de la aplicación
COPY . .

# Establece el entorno a producción para la construcción de Next.js
EXPOSE 3000

# Construye la aplicación Next.js para producción
# Reemplaza 'build' si tu script de build se llama diferente en package.json
CMD ["npm", "run", "dev"]
