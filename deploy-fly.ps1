# Fly.io deployment script for easycod-dz Shopify app
# This script handles the deployment process and avoids the MPG panic

# Configuration
$APP_NAME = "easycod-dz"
$REGION = "iad"
$APP_URL = "https://easycod-dz.fly.dev"

Write-Host "🚀 Starting Fly.io deployment for $APP_NAME..." -ForegroundColor Blue

# Function to print colored output
function Write-Status {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param($Message)
    Write-Host "📋 $Message" -ForegroundColor Blue
}

# Check if flyctl is installed
Write-Info "Checking flyctl installation..."
try {
    fly version | Out-Null
    Write-Status "flyctl is installed"
} catch {
    Write-Error "flyctl is not installed. Please install it first:"
    Write-Host "   curl -L https://fly.io/install.sh | sh" -ForegroundColor Yellow
    exit 1
}

# Check flyctl version
Write-Info "Checking flyctl version..."
fly version

# Update flyctl to latest version
Write-Info "Updating flyctl to latest version..."
fly version update

# Check authentication
Write-Info "Checking authentication..."
try {
    $whoami = fly auth whoami 2>$null
    if ($whoami) {
        Write-Status "Authenticated as $whoami"
    } else {
        throw "Not authenticated"
    }
} catch {
    Write-Error "Not authenticated. Please login first:"
    Write-Host "   fly auth login" -ForegroundColor Yellow
    exit 1
}

# Check if app exists
Write-Info "Checking if app exists..."
$appExists = fly apps list | Select-String $APP_NAME
if ($appExists) {
    Write-Status "App '$APP_NAME' exists"
} else {
    Write-Error "App '$APP_NAME' does not exist. Please create it first:"
    Write-Host "   fly apps create $APP_NAME" -ForegroundColor Yellow
    exit 1
}

# Validate configuration
Write-Info "Validating configuration..."
try {
    fly config validate | Out-Null
    Write-Status "Configuration is valid"
} catch {
    Write-Error "Configuration validation failed"
    exit 1
}

# Check if secrets are set
Write-Info "Checking secrets..."
$secretsExist = fly secrets list | Select-String "SHOPIFY_API_KEY"
if (-not $secretsExist) {
    Write-Warning "Shopify secrets not found. Setting them now..."
    
    # Check if API secret is provided
    if (-not $env:SHOPIFY_API_SECRET) {
        $env:SHOPIFY_API_SECRET = Read-Host "Please enter your SHOPIFY_API_SECRET" -AsSecureString
        $env:SHOPIFY_API_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:SHOPIFY_API_SECRET))
    }
    
    fly secrets set `
        SHOPIFY_API_KEY="78b3b49a43d2ac2ca7e3abaf380e011d" `
        SHOPIFY_API_SECRET="$env:SHOPIFY_API_SECRET" `
        SHOPIFY_APP_URL="$APP_URL" `
        SCOPES="read_draft_orders,read_metaobject_definitions,read_metaobjects,read_online_store_pages,read_products,read_orders,write_draft_orders,write_metaobject_definitions,write_metaobjects,write_online_store_pages,write_products,write_orders" `
        --no-restart
    
    Write-Status "Secrets set successfully"
} else {
    Write-Status "Secrets already configured"
}

# Deploy with explicit configuration to avoid MPG panic
Write-Info "Deploying to Fly.io..."
Write-Host "Region: $REGION" -ForegroundColor Cyan
Write-Host "Strategy: immediate" -ForegroundColor Cyan
Write-Host "Build: local-only" -ForegroundColor Cyan

try {
    fly deploy --regions $REGION --ha=false --local-only --strategy immediate --no-postgres
    
    Write-Status "Deployment completed successfully!"
    Write-Host "🔗 Your app should be available at: $APP_URL" -ForegroundColor Cyan
    
    # Wait a moment for the app to start
    Write-Info "Waiting for app to start..."
    Start-Sleep -Seconds 10
    
    # Show app status
    Write-Info "App status:"
    fly status
    
    # Show recent logs
    Write-Info "Recent logs:"
    fly logs --lines 20
    
    Write-Status "Deployment finished!"
    
} catch {
    Write-Error "Deployment failed!"
    Write-Info "Recent logs for debugging:"
    fly logs --lines 50
    exit 1
}
