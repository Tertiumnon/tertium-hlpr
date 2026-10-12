#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import os from 'node:os'
import { formatInfo, powershellJson } from '../../../core/command/system.js'

// @description Show grouped motherboard, BIOS, expansion, CPU, RAM, GPU, disks, and OS information

type Section = Record<string, string>

function windowsInfo(): Record<string, Section> {
  return powershellJson<Record<string, Section>>(`
    $computer = Get-CimInstance Win32_ComputerSystem;
    $board = Get-CimInstance Win32_BaseBoard;
    $bios = Get-CimInstance Win32_BIOS;
    $cpu = Get-CimInstance Win32_Processor;
    $memory = Get-CimInstance Win32_PhysicalMemory;
    $memoryArrays = Get-CimInstance Win32_PhysicalMemoryArray;
    $physicalDisks = @(Get-PhysicalDisk -ErrorAction SilentlyContinue);
    $sataDisks = @($physicalDisks | Where-Object { $_.BusType -eq 'SATA' });
    $slots = Get-CimInstance Win32_SystemSlot;
    $gpu = Get-CimInstance Win32_VideoController;
    $nvidiaSmi = Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue;
    $nvidia = if ($nvidiaSmi) { & $nvidiaSmi.Source --query-gpu=memory.total --format=csv,noheader 2>$null } else { $null };
    $os = Get-CimInstance Win32_OperatingSystem;
    [ordered]@{
      'M/B' = [ordered]@{
        Manufacturer = $computer.Manufacturer;
        Model = $computer.Model;
        Motherboard = (($board | ForEach-Object { "$($_.Manufacturer) $($_.Product)" }) -join ', ');
        'CPU socket' = (($cpu | ForEach-Object { $_.SocketDesignation } | Where-Object { $_ } | Select-Object -Unique) -join ', ')
      };
      BIOS = [ordered]@{ Version = "$($bios.Manufacturer) $($bios.SMBIOSBIOSVersion)" };
      Expansion = [ordered]@{
        Slots = (($slots | ForEach-Object {
        if ($_.SlotDesignation) {
          $label = "$($_.SlotDesignation) slot";
          $occupied = $_.CurrentUsage -ne 3;
          $value = if ($occupied -and $_.Description) { "$($_.Description) (In use)" } else { '<free>' };
          "$label$([char]9)$value"
        }
        }) -join [char]10);
        'SATA connections' = "$( $sataDisks.Count ) connected; total ports not reported";
        'M.2/NVMe' = "$( @($physicalDisks | Where-Object { $_.BusType -eq 'NVMe' }).Count ) NVMe drives detected; total slots not reported"
      };
      CPU = [ordered]@{
        Name = (($cpu | ForEach-Object { $_.Name.Trim() }) -join ', ');
        'Physical cores' = [string](($cpu | Measure-Object NumberOfCores -Sum).Sum);
        'Logical CPUs' = [string](($cpu | Measure-Object NumberOfLogicalProcessors -Sum).Sum);
        'Base frequency' = (($cpu | ForEach-Object { "$($_.MaxClockSpeed) MHz" }) -join ', ')
      };
      RAM = [ordered]@{
        Slots = (($memoryArrays | ForEach-Object { [int]$_.MemoryDevices } | Measure-Object -Sum).Sum);
        Modules = (($memory | ForEach-Object {
          $name = ([string]$_.PartNumber).Trim(); if (-not $name) { $name = ([string]$_.Manufacturer).Trim() };
          "{0}$([char]9){1}, {2} GiB @ {3} MHz (configured {4} MHz)" -f $_.DeviceLocator, $name, ([math]::Round($_.Capacity / 1GB, 1)), $_.Speed, $_.ConfiguredClockSpeed
        }) -join [char]10)
      };
      GPU = [ordered]@{
        Manufacturer = (($gpu | ForEach-Object { $_.AdapterCompatibility } | Where-Object { $_ } | Select-Object -Unique) -join ', ');
        Name = (($gpu | ForEach-Object { $_.Name }) -join ', ');
        Type = if ($nvidiaSmi) { 'Not reported' } else { (($gpu | ForEach-Object { switch ($_.VideoMemoryType) { 1 {'Other'} 2 {'DRAM'} 3 {'VRAM'} 4 {'SDRAM'} 5 {'SGRAM'} 6 {'DDR'} 7 {'DDR2'} 8 {'DDR2 FB-DIMM'} 9 {'DDR3'} 10 {'FBD2'} 11 {'DDR4'} 12 {'LPDDR'} 13 {'HBM'} 14 {'HBM2'} 15 {'DDR5'} 16 {'LPDDR5'} default {'Not reported'} } } | Select-Object -Unique) -join ', ') };
        Physical = (($gpu | ForEach-Object { if ($_.AdapterRAM) { "{0} GiB" -f ([math]::Round($_.AdapterRAM / 1GB, 1)) } }) -join ', ');
        VRAM = if ($nvidia) { (($nvidia | ForEach-Object { if ($_ -match '([0-9]+)[ ]*MiB') { "{0} GiB" -f ([math]::Round([int]$Matches[1] / 1024, 1)) } else { $_.Trim() } }) -join ', ') } else { 'Not reported' }
      };
      Disks = [ordered]@{ Devices = (($physicalDisks | ForEach-Object { "{0}$([char]9){1} {2}, {3} GiB" -f $_.FriendlyName, $_.BusType, $_.MediaType, ([math]::Round($_.Size / 1GB, 1)) }) -join [char]10) };
      OS = [ordered]@{ Name = $os.Caption; Version = $os.Version; Architecture = $os.OSArchitecture; Hostname = $computer.Name }
    }`)
}

function systemSections(): Record<string, Section> {
  const cpus = os.cpus()
  const minutes = Math.floor(os.uptime() / 60)
  const sections: Record<string, Section> = {
    'M/B': { Manufacturer: 'Unavailable', Model: 'Unavailable', Motherboard: 'Unavailable', 'CPU socket': 'Not reported' },
    BIOS: { Version: 'Unavailable' },
    Expansion: { Slots: 'Unavailable', 'SATA connections': 'Not reported', 'M.2/NVMe': 'Not reported' },
    CPU: {
      Name: [...new Set(cpus.map(cpu => cpu.model.trim()))].join(', ') || 'Unavailable',
      'Physical cores': 'Unavailable',
      'Logical CPUs': String(cpus.length),
      'Base frequency': cpus[0]?.speed ? `${cpus[0].speed} MHz` : 'Unavailable',
    },
    RAM: { Slots: '0', Modules: 'Unavailable' },
    GPU: { Manufacturer: 'Unavailable', Name: 'Unavailable', Type: 'Unavailable', Physical: 'Unavailable', VRAM: 'Unavailable' },
    Disks: { Devices: 'Unavailable' },
    OS: { Name: `${os.type()} ${os.release()}`, Version: os.release(), Architecture: os.arch(), Hostname: os.hostname() },
    Uptime: { Time: `${Math.floor(minutes / 1440)}d ${Math.floor(minutes / 60) % 24}h ${minutes % 60}m` },
  }

  if (process.platform === 'win32') {
    const info = windowsInfoWithFallback(sections)
    info.Uptime = { Time: `${Math.floor(minutes / 1440)}d ${Math.floor(minutes / 60) % 24}h ${minutes % 60}m` }
    return info
  }
  if (process.platform === 'linux') {
    const dmi: Record<string, string> = {
      Manufacturer: 'sys_vendor', Model: 'product_name', Motherboard: 'board_name', BIOS: 'bios_version',
    }
    for (const [label, file] of Object.entries(dmi)) {
      try {
        if (label === 'BIOS') sections.BIOS.Version = readFileSync(`/sys/class/dmi/id/${file}`, 'utf8').trim()
        else if (label === 'Motherboard' || label === 'Manufacturer' || label === 'Model') sections['M/B'][label] = readFileSync(`/sys/class/dmi/id/${file}`, 'utf8').trim()
      } catch { /* DMI fields may be hidden by firmware or a VM. */ }
    }
    try {
      sections.Expansion.Slots = readFileSync('/sys/bus/pci/slots', 'utf8').trim() || 'No slots reported'
    } catch { /* PCI slot details are optional. */ }
  } else if (process.platform === 'darwin') {
    try { sections['M/B'].Model = execFileSync('sysctl', ['-n', 'hw.model'], { encoding: 'utf8', timeout: 5000 }).trim() }
    catch { /* Hardware model can be unavailable in restricted environments. */ }
  }
  return sections
}

function windowsInfoWithFallback(fallback: Record<string, Section>): Record<string, Section> {
  try { return windowsInfo() }
  catch { return fallback }
}

export function systemInfo(): [string, string][] {
  const sections = systemSections()
  return Object.entries(sections).flatMap(([heading, fields]) => [
    [heading, ''] as [string, string],
    ...(heading === 'RAM' && fields.Modules !== 'Unavailable'
      ? [...fields.Modules.split('\n').map((module, index) => {
          const [locator, value] = module.split('\t')
          return [`${locator || `Slot ${index + 1}`} slot`, value] as [string, string]
        }), ...Array.from({ length: Math.max(0, Number(fields.Slots) - fields.Modules.split('\n').length) }, (_, index) => [`Slot ${fields.Modules.split('\n').length + index + 1} slot`, '<free>'] as [string, string])]
      : heading === 'Expansion' && fields.Slots !== 'Unavailable'
        ? [...fields.Slots.split('\n').map((slot, index) => {
            const [label, value] = slot.split('\t')
            return [label || `Slot ${index + 1}`, value] as [string, string]
          }), ...Object.entries(fields).filter(([label]) => label !== 'Slots')]
      : heading === 'Disks' && fields.Devices !== 'Unavailable'
        ? [...fields.Devices.split('\n').map((disk, index) => {
            const [name, value] = disk.split('\t')
            return [name || `Disk ${index + 1}`, value] as [string, string]
          })]
          : Object.entries(fields).filter(([label]) => !(heading === 'RAM' && label === 'Modules'))),
  ])
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: hlpr system info')
    console.log('Show grouped motherboard, BIOS, expansion, CPU, RAM, GPU, disks, OS, and uptime details.')
    process.exit(0)
  }
  if (args.length) {
    console.error('Usage: hlpr system info')
    process.exit(1)
  }
  try { console.log(formatInfo(systemInfo())) }
  catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}
