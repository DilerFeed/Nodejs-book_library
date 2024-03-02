# Використовуємо офіційний образ Node.js
FROM node:16

# Встановлення робочого каталогу
WORKDIR /app

# Копіюємо package.json і package-lock.json в робочий каталог
COPY package*.json ./

# Встановлюємо залежності
RUN npm install

# Копіюємо решту коду програми
COPY . .

# Відкриваємо порт, на якому працює програма
EXPOSE 3000

# Команда для запуску програми
CMD ["node", "index.js"]
