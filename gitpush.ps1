# gitpush.ps1

# Add .gitkeep to all empty directories
Get-ChildItem -Directory -Recurse | 
    Where-Object { 
        $_.FullName -notmatch '\.git' -and 
        $_.FullName -notmatch 'node_modules' -and
        (Get-ChildItem $_.FullName -Force).Count -eq 0 
    } | 
    ForEach-Object { 
        New-Item -Path "$($_.FullName)\.gitkeep" -ItemType File -Force 
    }

# Stage all changes
git add .

# Commit if there are changes (optional - remove if you prefer to commit manually)
$changes = git status --porcelain
if ($changes) {
    $message = if ($args[0]) { $args[0] } else { "Update with empty directories" }
    git commit -m $message
}

# Push to remote
git push