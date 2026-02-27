#!/bin/bash

# ─────────────────────────────────────────────────────
# OSS Opportunities Portal - Deployment Script
# ─────────────────────────────────────────────────────

set -e

echo "🚀 Starting OSS Opportunities Portal deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "📝 Created .env file. Please edit it with your credentials."
        echo "   Required: DB_PASSWORD, OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, OUTLOOK_TENANT_ID, OUTLOOK_USER_EMAIL"
        exit 1
    else
        echo "❌ .env.example not found. Please create .env file manually."
        exit 1
    fi
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "📦 Building Docker images..."
docker-compose build

echo "🛑 Stopping existing containers..."
docker-compose down

echo "🚀 Starting containers..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are healthy
echo "🔍 Checking service health..."

if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "─────────────────────────────────────────────────────"
    echo "🌐 Application is now running!"
    echo "   Access it at: http://your-domain.com:90"
    echo ""
    echo "📊 Services:"
    echo "   • Nginx (Reverse Proxy): Port 90"
    echo "   • Backend API: Internal port 8000"
    echo "   • MySQL Database: Internal only"
    echo ""
    echo "📝 Useful commands:"
    echo "   • View logs:     docker-compose logs -f"
    echo "   • Stop:          docker-compose down"
    echo "   • Restart:       docker-compose restart"
    echo "   • Rebuild:       docker-compose up -d --build"
    echo "─────────────────────────────────────────────────────"
else
    echo "❌ Deployment failed. Check logs with: docker-compose logs"
    exit 1
fi
