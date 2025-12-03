# Dockerfile
# Використовуємо офіційний образ Node.js
FROM node:20

# Встановлюємо робочу директорію
WORKDIR /app

# Копіюємо package.json та package-lock.json для встановлення залежностей
COPY package*.json ./

# Встановлюємо залежності
RUN npm install

# Копіюємо решту коду
COPY . .

# Запускаємо процес build
RUN npm run build

# Встановлюємо порт
ENV PORT 3306
EXPOSE 3306

# Запускаємо додаток
CMD [ "npm", "run", "start:prod" ]
