' ============================================================
' OmniKB Windows Startup Shortcut Installer
' Dynamically resolves current repository folder
' ============================================================
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
repoRoot = fso.GetParentFolderName(scriptDir)
vbsTarget = fso.BuildPath(scriptDir, "omnikb-silent.vbs")

Set oLink = WshShell.CreateShortcut(WshShell.SpecialFolders("Startup") & "\OmniKB.lnk")
oLink.TargetPath = vbsTarget
oLink.WorkingDirectory = repoRoot
oLink.Description = "OmniKB Universal Real-Time Knowledge Base"
oLink.WindowStyle = 7
oLink.Save

WScript.Echo "OmniKB startup shortcut installed successfully!"
WScript.Echo "Target: " & vbsTarget
WScript.Echo "Startup Location: " & WshShell.SpecialFolders("Startup") & "\OmniKB.lnk"

Set oLink = Nothing
Set WshShell = Nothing
Set fso = Nothing
