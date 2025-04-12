# Usar la imagen oficial de Node.js
FROM node:slim

# Crear y establecer el directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos de la aplicación
COPY . .

# Exponer el puerto 3002
EXPOSE 3002

# Comando para iniciar la aplicación
CMD ["npm", "run", "dev"]