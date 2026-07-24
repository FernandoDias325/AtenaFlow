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

# Cria a imagem 1400x560
$newImage = New-Object System.Drawing.Bitmap(1400, 560, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$graphics = [System.Drawing.Graphics]::FromImage($newImage)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Fundo azul acinzentado claro
$bgColor = [System.Drawing.Color]::FromArgb(255, 235, 240, 246)
$brush = New-Object System.Drawing.SolidBrush($bgColor)
$graphics.FillRectangle($brush, 0, 0, 1400, 560)

# Vamos desenhar até 3 imagens lado a lado para preencher a largura de 1400
$imgCount = [Math]::Min($files.Count, 3)
$totalSpacing = 1400

# Altura máxima permitida com margem (560 - 80 = 480px)
$maxHeight = 480
$shadow1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(10, 0, 0, 0))
$shadow2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 0, 0, 0))

# Calcula as dimensões
$drawnWidths = @()
$images = @()

for ($i = 0; $i -lt $imgCount; $i++) {
    $img = [System.Drawing.Image]::FromFile($files[$i].FullName)
    $ratio = $maxHeight / $img.Height
    $newWidth = [int]($img.Width * $ratio)
    $drawnWidths += $newWidth
    $images += $img
}

$totalImgWidth = 0
foreach ($w in $drawnWidths) { $totalImgWidth += $w }

# Espaço entre as imagens e bordas
$gap = [int](($totalSpacing - $totalImgWidth) / ($imgCount + 1))
$currentX = $gap

for ($i = 0; $i -lt $imgCount; $i++) {
    $img = $images[$i]
    $w = $drawnWidths[$i]
    $h = $maxHeight
    $posY = [int]((560 - $h) / 2)
    
    # Sombras
    $graphics.FillRectangle($shadow1, $currentX - 8, $posY - 8, $w + 16, $h + 16)
    $graphics.FillRectangle($shadow2, $currentX - 3, $posY - 3, $w + 6, $h + 6)
    
    # Imagem
    $graphics.DrawImage($img, $currentX, $posY, $w, $h)
    
    $currentX += $w + $gap
    $img.Dispose()
}

$outputPath = Join-Path $outputDir "promo_marquee_1400x560.png"
$newImage.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$newImage.Dispose()
$brush.Dispose()
$shadow1.Dispose()
$shadow2.Dispose()

Write-Output "Bloco promocional de letreiro (1400x560) gerado com sucesso na pasta prints_loja!"
