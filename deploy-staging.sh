#!/bin/bash

# Fly.io staging deployment script for easycod-dz Shopify app
# This script handles the staging deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="easycod-dz-staging"
REGION="iad"
APP_URL="https://easycod-dz-staging.fly.dev"

echo -e "${BLUE}🧪 Starting Fly.io staging deployment for $APP_NAME...${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}📋 $1${NC}"
}

# Check if flyctl is installed
print_info "Checking flyctl installation..."
if ! command -v fly &> /dev/null; then
    print_error "flyctl is not installed. Please install it first:"
    echo -e "${YELLOW}   curl -L https://fly.io/install.sh | sh${NC}"
    exit 1
fi
print_status "flyctl is installed"

# Check flyctl version
print_info "Checking flyctl version..."
fly version

# Update flyctl to latest version
print_info "Updating flyctl to latest version..."
fly version update

# Check authentication
print_info "Checking authentication..."
if ! fly auth whoami &> /dev/null; then
    print_error "Not authenticated. Please login first:"
    echo -e "${YELLOW}   fly auth login${NC}"
    exit 1
fi
print_status "Authenticated as $(fly auth whoami)"

# Check if staging app exists, create if not
print_info "Checking if staging app exists..."
if fly apps list | grep -q "$APP_NAME"; then
    print_status "Staging app '$APP_NAME' exists"
else
    print_warning "Staging app '$APP_NAME' does not exist. Creating it now..."
    fly apps create "$APP_NAME"
    print_status "Staging app created"
fi

# Validate configuration
print_info "Validating staging configuration..."
if fly config validate --config fly-staging.toml; then
    print_status "Staging configuration is valid"
else
    print_error "Staging configuration validation failed"
    exit 1
fi

# Check if secrets are set
print_info "Checking staging secrets..."
if ! fly secrets list --app "$APP_NAME" | grep -q "SHOPIFY_API_KEY"; then
    print_warning "Staging secrets not found. Setting them now..."
    
    # Prompt for API secret if not provided
    if [ -z "$SHOPIFY_API_SECRET" ]; then
        echo -e "${YELLOW}Please enter your SHOPIFY_API_SECRET:${NC}"
        read -s SHOPIFY_API_SECRET
        echo
    fi
    
    fly secrets set \
        SHOPIFY_API_KEY="78b3b49a43d2ac2ca7e3abaf380e011d" \
        SHOPIFY_API_SECRET="$SHOPIFY_API_SECRET" \
        SHOPIFY_APP_URL="$APP_URL" \
        SESSION_SECRET="staging-session-secret-$(openssl rand -hex 32)" \
        NODE_ENV="staging" \
        --app "$APP_NAME" \
        --no-restart
    
    print_status "Staging secrets set successfully"
else
    print_status "Staging secrets already configured"
fi

# Deploy to staging with explicit configuration
print_info "Deploying to Fly.io staging..."
echo -e "${CYAN}App: $APP_NAME${NC}"
echo -e "${CYAN}Region: $REGION${NC}"
echo -e "${CYAN}Strategy: immediate${NC}"
echo -e "${CYAN}Build: local-only${NC}"

if fly deploy \
    --app "$APP_NAME" \
    --config fly-staging.toml \
    --regions "$REGION" \
    --ha=false \
    --local-only \
    --strategy immediate \
    --no-postgres; then
    
    print_status "Staging deployment completed successfully!"
    echo -e "${CYAN}🔗 Staging app should be available at: $APP_URL${NC}"
    
    # Wait a moment for the app to start
    print_info "Waiting for staging app to start..."
    sleep 10
    
    # Show app status
    print_info "Staging app status:"
    fly status --app "$APP_NAME"
    
    # Show recent logs
    print_info "Recent staging logs:"
    fly logs --app "$APP_NAME" --lines 20
    
    print_status "Staging deployment finished!"
    
else
    print_error "Staging deployment failed!"
    print_info "Recent staging logs for debugging:"
    fly logs --app "$APP_NAME" --lines 50
    exit 1
fi
