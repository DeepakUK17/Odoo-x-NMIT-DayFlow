param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("deepak", "aishwarya")]
    [string]$User
)

$users = @{
    "deepak" = @{
        name = "Deepak U K"
        email = "dileepdeepakudaya@gmail.com" # Assuming this is Deepak's email based on SMTP config
    }
    "aishwarya" = @{
        name = "Aishwarya Muruganantham"
        email = "aishwarya@example.com" # Update this email
    }
}

$selected = $users[$User]

git config --local user.name $selected.name
git config --local user.email $selected.email

Write-Host "✅ Git user switched to $($selected.name) ($($selected.email)) for this repository." -ForegroundColor Green
Write-Host "Current config:"
git config --local --get user.name
git config --local --get user.email
