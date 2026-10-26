# 旧形式 .doc を Word で開き、文書の中身（Flat OPC 形式の XML）を書き出す。
# そのあと tools\flat_opc_to_docx.py で .docx に組み立てる。
# 元ファイルは読み取り専用で開き、変更しない。
#
# なぜ SaveAs2 を使わないか（2026-10-26）：
#   このパソコンの Word は、自動操作で「名前を付けて保存」（SaveAs2）を呼ぶと、
#   .docx でも .txt でも、画面に何も出ないまま5分以上止まった。
#   Word の中身の取り出し（WordOpenXML）は1秒で返るので、そちらを使う。
#
# 使い方: powershell -ExecutionPolicy Bypass -File tools\convert_doc_to.ps1 "<入力フォルダ>" "<出力フォルダ>"
param(
    [Parameter(Mandatory=$true)][string]$InFolder,
    [Parameter(Mandatory=$true)][string]$OutFolder
)
$docs = Get-ChildItem -LiteralPath $InFolder -Filter *.doc | Where-Object { $_.Extension -eq ".doc" }
if (-not $docs) { "対象の .doc はありません"; exit 0 }
New-Item -ItemType Directory -Force -Path $OutFolder | Out-Null
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$utf8 = New-Object System.Text.UTF8Encoding($false)
$n = 0
try {
    foreach ($f in $docs) {
        $dst = Join-Path $OutFolder ([System.IO.Path]::ChangeExtension($f.Name, ".flat.xml"))
        if (Test-Path -LiteralPath $dst) { "スキップ（書き出し済み）: $($f.Name)"; continue }
        # Open(FileName, ConfirmConversions=false, ReadOnly=true, AddToRecentFiles=false)
        $doc = $word.Documents.Open($f.FullName, $false, $true, $false)
        [System.IO.File]::WriteAllText($dst, $doc.WordOpenXML, $utf8)
        $doc.Close($false)
        $n++
        "書き出し: $($f.Name)"
    }
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
"完了: $n 件"
