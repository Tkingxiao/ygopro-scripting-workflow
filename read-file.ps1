$bytes = [System.IO.File]::ReadAllBytes("C:\Users\Lenovo\Downloads\ygopro-scripting-workflow-master\workspace\实验.cdb")
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$text.Substring(0, [Math]::Min(2000, $text.Length))