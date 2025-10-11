# 🚀 EasyCOD-DZ Render Deployment Script (PowerShell)
# This script helps you prepare and deploy your Shopify Remix app to Render

param(
    [switch]$SkipBuild,
    [switch]$SkipGit
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

Write-Host "🚀 EasyCOD-DZ Render Deployment Script" -ForegroundColor $Green
Write-Host "======================================" -ForegroundColor $Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found. Please run this script from your project root."
    exit 1
}

Write-Status "Checking project structure..."

# Check if required files exist
$requiredFiles = @("package.json", "remix.config.js", "shopify.app.alma-cod.toml")
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Success "$file found"
    } else {
        Write-Warning "$file not found. This might cause deployment issues."
    }
}

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Warning "Git not initialized. Initializing now..."
    git init
    Write-Success "Git initialized"
} else {
    Write-Success "Git repository found"
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Status "Installing dependencies..."
    npm install
    Write-Success "Dependencies installed"
} else {
    Write-Success "Dependencies already installed"
}

# Test build
if (-not $SkipBuild) {
    Write-Status "Testing production build..."
    try {
        npm run build
        Write-Success "Production build successful"
    } catch {
        Write-Error "Production build failed. Please fix build errors before deploying."
        Write-Host "You can skip the build test with -SkipBuild flag"
        exit 1
    }
}

# Check if we have uncommitted changes
if (-not $SkipGit) {
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Warning "You have uncommitted changes."
        $response = Read-Host "Do you want to commit them now? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            git add .
            git commit -m "Prepare for Render deployment"
            Write-Success "Changes committed"
        } else {
            Write-Warning "Please commit your changes before deploying."
        }
    }

    # Check if remote origin is set
    try {
        $originUrl = git remote get-url origin 2>$null
        if (-not $originUrl) {
            Write-Warning "No GitHub remote origin set."
            Write-Host "Please set your GitHub repository URL:"
            Write-Host "git remote add origin https://github.com/<your-username>/easycod-dz.git"
            Write-Host ""
            $response = Read-Host "Do you want to set it now? (y/n)"
            if ($response -eq "y" -or $response -eq "Y") {
                $repoUrl = Read-Host "Enter your GitHub repository URL"
                git remote add origin $repoUrl
                Write-Success "Remote origin set to: $repoUrl"
            }
        }

        # Push to GitHub if remote is set
        try {
            $originUrl = git remote get-url origin 2>$null
            if ($originUrl) {
                Write-Status "Pushing to GitHub..."
                git push -u origin main
                Write-Success "Code pushed to GitHub"
            }
        } catch {
            Write-Warning "Failed to push to GitHub. Please push manually."
        }
    } catch {
        Write-Warning "Git operations failed. Please check your git configuration."
    }
}

Write-Host ""
Write-Host "🎉 Preparation complete!" -ForegroundColor $Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Go to https://render.com"
Write-Host "2. Sign in with GitHub"
Write-Host "3. Click 'New +' → 'Web Service'"
Write-Host "4. Select your easycod-dz repository"
Write-Host "5. Use these settings:"
Write-Host "   - Build Command: npm install && npm run build"
Write-Host "   - Start Command: npm run start"
Write-Host "   - Health Check Path: /ping"
Write-Host ""
Write-Host "6. Add environment variables:"
Write-Host "   - SHOPIFY_API_KEY: your_api_key"
Write-Host "   - SHOPIFY_API_SECRET: your_secret_key"
Write-Host "   - SCOPES: read_products,write_orders,read_orders,write_checkouts,read_checkouts"
Write-Host "   - HOST: https://your-app-name.onrender.com (update after deployment)"
Write-Host "   - DATABASE_URL: your_postgresql_url (optional)"
Write-Host ""
Write-Host "7. Update your Shopify Partner Dashboard with the new app URL"
Write-Host ""
Write-Host "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"
Write-Host ""
Write-Success "Ready for Render deployment! 🚀"
