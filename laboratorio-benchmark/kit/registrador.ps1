# Grava clock efetivo, utilização e zona térmica a cada segundo. Ctrl+C para parar.
$saida  = "$env:USERPROFILE\Desktop\log_cpu.csv"
$inicio = Get-Date
"Gravando em $saida  (Ctrl+C para parar)"

while ($true) {
    $p = Get-CimInstance Win32_PerfFormattedData_Counters_ProcessorInformation -Filter "Name='_Total'"
    $t = Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation -ErrorAction SilentlyContinue |
         Select-Object -First 1
    $linha = [pscustomobject]@{
        Segundo     = [int]((Get-Date) - $inicio).TotalSeconds
        MHz_efetivo = [math]::Round($p.ProcessorFrequency * $p.PercentProcessorPerformance / 100)
        Utilizacao  = $p.PercentProcessorUtility
        Temp_C      = if ($t) { [math]::Round($t.Temperature - 273.15, 1) } else { '' }
    }
    $linha | Export-Csv $saida -Append -NoTypeInformation -Delimiter ';' -Encoding UTF8
    $linha | Format-Table -HideTableHeaders
    Start-Sleep -Seconds 1
}
