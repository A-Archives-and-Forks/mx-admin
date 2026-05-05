export NODE_OPTIONS=--max-old-space-size=32768

# CI safeguard: sync apps/admin version from the pushed tag so the injected
# window.version always matches the released tag, even if bumpp was skipped.
if [ -n "$GITHUB_REF_NAME" ]; then
  VERSION="${GITHUB_REF_NAME#v}"
  node -e "const fs=require('fs');const p='apps/admin/package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));if(j.version!==process.argv[1]){j.version=process.argv[1];fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');console.log('synced apps/admin version to '+process.argv[1])}" "$VERSION"
fi

pnpm i
pnpm build
(cd apps/admin && zip -r ../../release.zip dist/*)
