#!/bin/bash
# Add our CloudFront domain to the CI project's Lambda CORS config.
# Safe to run multiple times — only adds if not already present.

set -euo pipefail

FUNCTION_NAME="${1:-illuminate-api-dev}"
NEW_ORIGIN="${2:-}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

if [ -z "$NEW_ORIGIN" ]; then
  echo "Usage: $0 <function-name> <origin-url>"
  echo "  e.g. $0 illuminate-api-dev https://dqyv5l7xvxejx.cloudfront.net"
  exit 1
fi

# Get current env vars
ENV_JSON=$(aws lambda get-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query "Environment.Variables" \
  --output json)

# Check if origin already present
CURRENT_ORIGINS=$(echo "$ENV_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ALLOWED_ORIGINS',''))")

if echo "$CURRENT_ORIGINS" | grep -q "$NEW_ORIGIN"; then
  echo "Origin $NEW_ORIGIN already in ALLOWED_ORIGINS. No update needed."
  exit 0
fi

# Append our origin
UPDATED_JSON=$(echo "$ENV_JSON" | python3 -c "
import sys, json
env = json.load(sys.stdin)
env['ALLOWED_ORIGINS'] = env.get('ALLOWED_ORIGINS','') + ',$NEW_ORIGIN'
print(json.dumps({'Variables': env}))
")

aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --environment "$UPDATED_JSON" \
  --query "Environment.Variables.ALLOWED_ORIGINS" \
  --output text

echo "✅ Added $NEW_ORIGIN to $FUNCTION_NAME ALLOWED_ORIGINS"
