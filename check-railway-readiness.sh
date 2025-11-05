#!/bin/bash

echo "🔍 Проверка готовности проекта к Railway деплою..."
echo ""

# Проверка Node.js
echo "✓ Проверка Node.js..."
node --version || echo "❌ Node.js не установлен"

# Проверка npm
echo "✓ Проверка npm..."
npm --version || echo "❌ npm не установлен"

# Проверка зависимостей
echo "✓ Проверка package.json..."
if [ -f "package.json" ]; then
    echo "  ✓ package.json найден"
else
    echo "  ❌ package.json не найден"
fi

# Проверка важных файлов
echo ""
echo "✓ Проверка файлов для Railway..."
files=(
    "Procfile"
    "railway.json"
    "server/index.js"
    "server/database/db.js"
    "server/database/migrate.js"
    ".env.example"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ❌ $file не найден"
    fi
done

# Проверка переменных окружения
echo ""
echo "✓ Проверка переменных окружения..."
required_vars=(
    "PORT"
    "DB_HOST"
    "DB_NAME"
    "JWT_SECRET"
)

if [ -f ".env" ]; then
    echo "  ✓ .env файл существует"
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env; then
            echo "    ✓ $var установлен"
        else
            echo "    ⚠ $var не установлен"
        fi
    done
else
    echo "  ⚠ .env файл не найден (это нормально для деплоя)"
fi

# Проверка git
echo ""
echo "✓ Проверка Git..."
git remote -v | grep origin || echo "  ⚠ Git remote не настроен"

echo ""
echo "✅ Проверка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Идите на https://railway.app"
echo "2. Нажмите 'New Project'"
echo "3. Выберите 'Deploy from GitHub repo'"
echo "4. Выберите ваш репозиторий"
echo "5. Добавьте PostgreSQL базу данных"
echo "6. Настройте переменные окружения"
echo ""
