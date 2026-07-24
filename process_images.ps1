Add-Type -AssemblyName System.Drawing

$inputDir = ".\prints"
$outputDir = ".\prints_loja"
if (!(Test-Path -Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$files = Get-ChildItem -Path $inputDir -Filter "*.png"
$counter = 1

foreach ($file in $files) {
    # Carrega a imagem original
    $originalImage = [System.Drawing.Image]::FromFile($file.FullName)
    
    # Cria uma nova imagem 1280x800, Formato PixelFormat.Format24bppRgb (24-bit sem alpha, RGB)
    $newImage = New-Object System.Drawing.Bitmap(1280, 800, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    
    # Cria um objeto Graphics
    $graphics = [System.Drawing.Graphics]::FromImage($newImage)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Preenche o fundo com uma cor elegante (Azul acinzentado bem claro)
    $bgColor = [System.Drawing.Color]::FromArgb(255, 235, 240, 246)
    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $graphics.FillRectangle($brush, 0, 0, 1280, 800)
    
    # Redimensiona a original mantendo proporção 
    # Vou deixar a imagem grande, com margem de 40px no topo e na base (altura máxima 720px)
    $maxHeight = 720
    $maxWidth = 1200
    
    $ratioX = $maxWidth / $originalImage.Width
    $ratioY = $maxHeight / $originalImage.Height
    $ratio = [Math]::Min($ratioX, $ratioY)
    
    $newWidth = [int]($originalImage.Width * $ratio)
    $newHeight = [int]($originalImage.Height * $ratio)
    
    $posX = [int]((1280 - $newWidth) / 2)
    $posY = [int]((800 - $newHeight) / 2)
    
    # Desenha um "drop shadow" fake de várias camadas para dar profundidade e destaque
    $shadow1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(10, 0, 0, 0))
    $graphics.FillRectangle($shadow1, $posX - 10, $posY - 10, $newWidth + 20, $newHeight + 20)
    
    $shadow2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 0, 0, 0))
    $graphics.FillRectangle($shadow2, $posX - 4, $posY - 4, $newWidth + 8, $newHeight + 8)
    
    $shadow3 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(25, 0, 0, 0))
    $graphics.FillRectangle($shadow3, $posX - 1, $posY - 1, $newWidth + 2, $newHeight + 2)
    
    # Desenha a imagem centralizada
    $graphics.DrawImage($originalImage, $posX, $posY, $newWidth, $newHeight)
    
    # Salva como PNG
    $outputPath = Join-Path $outputDir "loja_$counter.png"
    $newImage.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Limpeza
    $graphics.Dispose()
    $originalImage.Dispose()
    $newImage.Dispose()
    $brush.Dispose()
    $shadow1.Dispose()
    $shadow2.Dispose()
    $shadow3.Dispose()
    
    $counter++
}
Write-Output "Script concluido. Imagens geradas na pasta prints_loja."
