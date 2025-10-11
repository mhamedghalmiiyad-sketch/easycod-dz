# Fly.io staging deployment script for easycod-dz Shopify app
# This script handles the staging deployment process

# Configuration
$APP_NAME = "easycod-dz-staging"
$REGION = "iad"
$APP_URL = "https://easycod-dz-staging.fly.dev"

Write-Host "🧪 Starting Fly.io staging deployment for $APP_NAME..." -ForegroundColor Blue

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

# Check if staging app exists, create if not
Write-Info "Checking if staging app exists..."
$appExists = fly apps list | Select-String $APP_NAME
if ($appExists) {
    Write-Status "Staging app '$APP_NAME' exists"
} else {
    Write-Warning "Staging app '$APP_NAME' does not exist. Creating it now..."
    fly apps create $APP_NAME
    Write-Status "Staging app created"
}

# Validate configuration
Write-Info "Validating staging configuration..."
try {
    fly config validate --config fly-staging.toml | Out-Null
    Write-Status "Staging configuration is valid"
} catch {
    Write-Error "Staging configuration validation failed"
    exit 1
}

# Check if secrets are set
Write-Info "Checking staging secrets..."
$secretsExist = fly secrets list --app $APP_NAME | Select-String "SHOPIFY_API_KEY"
if (-not $secretsExist) {
    Write-Warning "Staging secrets not found. Setting them now..."
    
    # Check if API secret is provided
    if (-not $env:SHOPIFY_API_SECRET) {
        $env:SHOPIFY_API_SECRET = Read-Host "Please enter your SHOPIFY_API_SECRET" -AsSecureString
        $env:SHOPIFY_API_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:SHOPIFY_API_SECRET))
    }
    
    # Generate staging session secret
    $stagingSessionSecret = "staging-session-secret-" + [System.Web.Security.Membership]::GeneratePassword(32, 0)
    
    fly secrets set `
        SHOPIFY_API_KEY="78b3b49a43d2ac2ca7e3abaf380e011d" `
        SHOPIFY_API_SECRET="$env:SHOPIFY_API_SECRET" `
        SHOPIFY_APP_URL="$APP_URL" `
        SESSION_SECRET="$stagingSessionSecret" `
        NODE_ENV="staging" `
        --app $APP_NAME `
        --no-restart
    
    Write-Status "Staging secrets set successfully"
} else {
    Write-Status "Staging secrets already configured"
}

# Deploy to staging with explicit configuration
Write-Info "Deploying to Fly.io staging..."
Write-Host "App: $APP_NAME" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan
Write-Host "Strategy: immediate" -ForegroundColor Cyan
Write-Host "Build: local-only" -ForegroundColor Cyan

try {
    fly deploy --app $APP_NAME --config fly-staging.toml --regions $REGION --ha=false --local-only --strategy immediate --no-postgres
    
    Write-Status "Staging deployment completed successfully!"
    Write-Host "🔗 Staging app should be available at: $APP_URL" -ForegroundColor Cyan
    
    # Wait a moment for the app to start
    Write-Info "Waiting for staging app to start..."
    Start-Sleep -Seconds 10
    
    # Show app status
    Write-Info "Staging app status:"
    fly status --app $APP_NAME
    
    # Show recent logs
    Write-Info "Recent staging logs:"
    fly logs --app $APP_NAME --lines 20
    
    Write-Status "Staging deployment finished!"
    
} catch {
    Write-Error "Staging deployment failed!"
    Write-Info "Recent staging logs for debugging:"
    fly logs --app $APP_NAME --lines 50
    exit 1
}
