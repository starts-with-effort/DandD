# Usa una imagen base oficial de Python. Elige la versión que usas en desarrollo.
# '-slim' es una versión más ligera.
FROM python:3.12-slim

# Establece variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE 1 # Evita que Python escriba archivos .pyc
ENV PYTHONUNBUFFERED 1       # Asegura que los logs de Python se muestren inmediatamente

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia el archivo de requerimientos y los instala
# Copiar solo requirements.txt primero aprovecha el caché de Docker si no cambia
COPY requirements.txt .
# --no-cache-dir: Deshabilita el caché de pip, reduciendo el tamaño de la imagen.
# -r requirements.txt: Instala los paquetes listados en el archivo.
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto del código de la aplicación al directorio de trabajo en el contenedor
COPY . .

# Expone el puerto en el que Django (a través de Gunicorn) se ejecutará dentro del contenedor.
# Esto NO publica el puerto al host, eso se hace en docker-compose.yml.
EXPOSE 8000

# Comando para ejecutar la aplicación cuando se inicie el contenedor.
# --bind 0.0.0.0:8000: Escucha en todas las interfaces de red dentro del contenedor en el puerto 8000.
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "backend.asgi:application"]