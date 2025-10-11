#!/bin/bash

# 🚀 EasyCOD-DZ Render Deployment Script
# This script helps you prepare and deploy your Shopify Remix app to Render

set -e

echo "🚀 EasyCOD-DZ Render Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from your project root."
    exit 1
fi

print_status "Checking project structure..."

# Check if required files exist
required_files=("package.json" "remix.config.js" "shopify.app.alma-cod.toml")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_warning "$file not found. This might cause deployment issues."
    else
        print_success "$file found"
    fi
done

# Check if git is initialized
if [ ! -d ".git" ]; then
    print_warning "Git not initialized. Initializing now..."
    git init
    print_success "Git initialized"
else
    print_success "Git repository found"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Test build
print_status "Testing production build..."
if npm run build; then
    print_success "Production build successful"
else
    print_error "Production build failed. Please fix build errors before deploying."
    exit 1
fi

# Check if we have uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_warning "You have uncommitted changes."
    echo "Do you want to commit them now? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Prepare for Render deployment"
        print_success "Changes committed"
    else
        print_warning "Please commit your changes before deploying."
    fi
fi

# Check if remote origin is set
if ! git remote get-url origin >/dev/null 2>&1; then
    print_warning "No GitHub remote origin set."
    echo "Please set your GitHub repository URL:"
    echo "git remote add origin https://github.com/<your-username>/easycod-dz.git"
    echo ""
    echo "Do you want to set it now? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Enter your GitHub repository URL:"
        read -r repo_url
        git remote add origin "$repo_url"
        print_success "Remote origin set to: $repo_url"
    fi
fi

# Push to GitHub if remote is set
if git remote get-url origin >/dev/null 2>&1; then
    print_status "Pushing to GitHub..."
    git push -u origin main
    print_success "Code pushed to GitHub"
else
    print_warning "No remote origin set. Please push to GitHub manually."
fi

echo ""
echo "🎉 Preparation complete!"
echo ""
echo "Next steps:"
echo "1. Go to https://render.com"
echo "2. Sign in with GitHub"
echo "3. Click 'New +' → 'Web Service'"
echo "4. Select your easycod-dz repository"
echo "5. Use these settings:"
echo "   - Build Command: npm install && npm run build"
echo "   - Start Command: npm run start"
echo "   - Health Check Path: /ping"
echo ""
echo "6. Add environment variables:"
echo "   - SHOPIFY_API_KEY: your_api_key"
echo "   - SHOPIFY_API_SECRET: your_secret_key"
echo "   - SCOPES: read_products,write_orders,read_orders,write_checkouts,read_checkouts"
echo "   - HOST: https://your-app-name.onrender.com (update after deployment)"
echo "   - DATABASE_URL: your_postgresql_url (optional)"
echo ""
echo "7. Update your Shopify Partner Dashboard with the new app URL"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo ""
print_success "Ready for Render deployment! 🚀"
