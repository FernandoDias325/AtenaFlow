Add-Type -AssemblyName System.Drawing

$inputDir = ".\prints"
$outputDir = ".\prints_loja"
if (!(Test-Path -Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$files = @(Get-ChildItem -Path $inputDir -Filter "*.png")
if ($files.Count -eq 0) {
    Write-Output "Nenhum arquivo encontrado em $inputDir"
    exit
}

$file = $files[0]

# Carrega a imagem original
$originalImage = [System.Drawing.Image]::FromFile($file.FullName)

# Cria a imagem 440x280
$newImage = New-Object System.Drawing.Bitmap(440, 280, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$graphics = [System.Drawing.Graphics]::FromImage($newImage)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Fundo azul acinzentado claro
$bgColor = [System.Drawing.Color]::FromArgb(255, 235, 240, 246)
$brush = New-Object System.Drawing.SolidBrush($bgColor)
$graphics.FillRectangle($brush, 0, 0, 440, 280)

# Redimensiona mantendo margem (altura max 240, largura max 380)
$maxHeight = 240
$maxWidth = 380

$ratioX = $maxWidth / $originalImage.Width
$ratioY = $maxHeight / $originalImage.Height
$ratio = [Math]::Min($ratioX, $ratioY)

$newWidth = [int]($originalImage.Width * $ratio)
$newHeight = [int]($originalImage.Height * $ratio)

$posX = [int]((440 - $newWidth) / 2)
$posY = [int]((280 - $newHeight) / 2)

# Shadow leve
$shadow1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(10, 0, 0, 0))
$graphics.FillRectangle($shadow1, $posX - 6, $posY - 6, $newWidth + 12, $newHeight + 12)

$shadow2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 0, 0, 0))
$graphics.FillRectangle($shadow2, $posX - 2, $posY - 2, $newWidth + 4, $newHeight + 4)

# Desenha a imagem
$graphics.DrawImage($originalImage, $posX, $posY, $newWidth, $newHeight)

$outputPath = Join-Path $outputDir "promo_440x280.png"
$newImage.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$originalImage.Dispose()
$newImage.Dispose()
$brush.Dispose()
$shadow1.Dispose()
$shadow2.Dispose()

Write-Output "Bloco promocional 440x280 gerado com sucesso na pasta prints_loja!"
