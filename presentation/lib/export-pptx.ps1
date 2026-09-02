param([string]$Pptx, [string]$OutDir, [switch]$Pdf)
$ErrorActionPreference = 'Stop'
$Pptx = (Resolve-Path $Pptx).Path
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
$OutDir = (Resolve-Path $OutDir).Path
$ppt = New-Object -ComObject PowerPoint.Application
try {
  $pres = $ppt.Presentations.Open($Pptx, $true, $false, $false)
  for ($i = 1; $i -le $pres.Slides.Count; $i++) {
    $n = '{0:D2}' -f $i
    $pres.Slides.Item($i).Export((Join-Path $OutDir "slide-$n.png"), "PNG", 2000, 1125)
  }
  Write-Output "png: $($pres.Slides.Count) slides -> $OutDir"
  if ($Pdf) {
    $pdfPath = [System.IO.Path]::ChangeExtension($Pptx, '.pdf')
    $pres.SaveAs($pdfPath, 32)
    Write-Output "pdf: $pdfPath"
  }
  $pres.Close()
} finally {
  $ppt.Quit()
}
