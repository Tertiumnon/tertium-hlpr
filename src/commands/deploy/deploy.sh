#!/bin/bash
# @description Deploy application to remote server with environment variables

SKIP_BUILD="{{SKIP_BUILD}}"
DEPLOY_USER="{{DEPLOY_USER}}"
DEPLOY_HOST="{{DEPLOY_HOST}}"
DEPLOY_PATH="{{DEPLOY_PATH}}"
APP_NAME="{{APP_NAME}}"

echo "Deploying to $DEPLOY_HOST:$DEPLOY_PATH"
echo "=========================================="

# Build phase (unless skip-build is set)
if [ "$SKIP_BUILD" != "true" ]; then
  echo "Building..."
  bun run build
  if [ $? -ne 0 ]; then
    echo "✗ Build failed"
    exit 1
  fi
fi

# Deploy phase
echo ""
echo "Copying files to remote server..."
scp -r dist/ $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/
if [ $? -ne 0 ]; then
  echo "✗ SCP failed"
  exit 1
fi

echo ""
echo "Installing dependencies and restarting service..."
ssh $DEPLOY_USER@$DEPLOY_HOST "cd $DEPLOY_PATH && bun install --production && pm2 restart $APP_NAME --update-env"
if [ $? -ne 0 ]; then
  echo "✗ Remote deployment failed"
  exit 1
fi

echo ""
echo "✓ Deployment complete!"
