# CrewOne HR - Day-End DevNote Updater
# Run at end of each working day to append today's work to CrewOne_HR_DevNote.docx
# Usage: Right-click > Run with PowerShell  OR  powershell -File devnote_update.ps1

$docPath  = "c:\Users\dell 3620\Documents\crewone-hr\CrewOne_HR_DevNote.docx"
$devlog   = "c:\Users\dell 3620\Documents\crewone-hr\DEVLOG.md"
$today    = Get-Date -Format "yyyy-MM-dd"
$dayLabel = Get-Date -Format "dddd, MMMM dd yyyy"

# --- Read today's DEVLOG entries ---
$logLines  = Get-Content $devlog -Encoding UTF8
$todayEntries = @()
$inToday   = $false

foreach ($line in $logLines) {
    if ($line -match "^#{1,3}\s+.*$today") { $inToday = $true }
    elseif ($inToday -and $line -match "^#{1,3}\s+\d{4}-\d{2}-\d{2}") { $inToday = $false }
    if ($inToday) { $todayEntries += $line }
}

if ($todayEntries.Count -eq 0) {
    Write-Host "No DEVLOG entries found for today ($today). Appending placeholder." -ForegroundColor Yellow
    $todayEntries = @("No entries logged today.")
}

$summary = $todayEntries -join "`n"

# --- Open Word and append ---
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false

    $doc = $word.Documents.Open($docPath)
    $sel = $word.Selection

    # Move to end of document
    $sel.EndKey(6) | Out-Null   # 6 = wdStory

    # Add a page break before new day entry (if doc already has content)
    $sel.InsertBreak(7) | Out-Null   # 7 = wdPageBreak

    # Heading: Day
    $sel.Style = $doc.Styles["Heading 1"]
    $sel.TypeText("Daily Update - $dayLabel")
    $sel.TypeParagraph()

    # Subheading
    $sel.Style = $doc.Styles["Heading 2"]
    $sel.TypeText("Changes from DEVLOG")
    $sel.TypeParagraph()

    # Body content
    $sel.Style = $doc.Styles["Normal"]
    foreach ($line in $todayEntries) {
        $clean = $line -replace '\*\*', '' -replace '^#+\s*', '' -replace '^-\s*', ''
        if ($clean.Trim() -ne '') {
            $sel.TypeText($clean.Trim())
            $sel.TypeParagraph()
        }
    }

    # Footer line
    $sel.TypeText("--- Updated by devnote_update.ps1 on $(Get-Date -Format 'HH:mm') ---")
    $sel.TypeParagraph()

    $doc.Save()
    $doc.Close()
    $word.Quit()

    Write-Host ""
    Write-Host "SUCCESS: DevNote updated for $today" -ForegroundColor Green
    Write-Host "File: $docPath" -ForegroundColor Cyan
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    try { $word.Quit() } catch {}
}

Write-Host ""
