#!/bin/bash

# Fly.io deployment script for easycod-dz Shopify app
# This script handles the deployment process and avoids the MPG panic

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="easycod-dz"
REGION="iad"
APP_URL="https://easycod-dz.fly.dev"

echo -e "${BLUE}🚀 Starting Fly.io deployment for $APP_NAME...${NC}"

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

# Check if app exists
print_info "Checking if app exists..."
if fly apps list | grep -q "$APP_NAME"; then
    print_status "App '$APP_NAME' exists"
else
    print_error "App '$APP_NAME' does not exist. Please create it first:"
    echo -e "${YELLOW}   fly apps create $APP_NAME${NC}"
    exit 1
fi

# Validate configuration
print_info "Validating configuration..."
if fly config validate; then
    print_status "Configuration is valid"
else
    print_error "Configuration validation failed"
    exit 1
fi

# Check if secrets are set
print_info "Checking secrets..."
if ! fly secrets list | grep -q "SHOPIFY_API_KEY"; then
    print_warning "Shopify secrets not found. Setting them now..."
    
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
        SCOPES="read_draft_orders,read_metaobject_definitions,read_metaobjects,read_online_store_pages,read_products,read_orders,write_draft_orders,write_metaobject_definitions,write_metaobjects,write_online_store_pages,write_products,write_orders" \
        --no-restart
    
    print_status "Secrets set successfully"
else
    print_status "Secrets already configured"
fi

# Deploy with explicit configuration to avoid MPG panic
print_info "Deploying to Fly.io..."
echo -e "${CYAN}Region: $REGION${NC}"
echo -e "${CYAN}Strategy: immediate${NC}"
echo -e "${CYAN}Build: local-only${NC}"

if fly deploy \
    --regions "$REGION" \
    --ha=false \
    --local-only \
    --strategy immediate \
    --no-postgres; then
    
    print_status "Deployment completed successfully!"
    echo -e "${CYAN}🔗 Your app should be available at: $APP_URL${NC}"
    
    # Wait a moment for the app to start
    print_info "Waiting for app to start..."
    sleep 10
    
    # Show app status
    print_info "App status:"
    fly status
    
    # Show recent logs
    print_info "Recent logs:"
    fly logs --lines 20
    
    print_status "Deployment finished!"
    
else
    print_error "Deployment failed!"
    print_info "Recent logs for debugging:"
    fly logs --lines 50
    exit 1
fi
