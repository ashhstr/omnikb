' ============================================================
' OmniKB Silent Background Runner
' ============================================================
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = fso.BuildPath(scriptDir, "omnikb-startup.bat")

WshShell.Run """" & batPath & """", 0, False

Set WshShell = Nothing
Set fso = Nothing
