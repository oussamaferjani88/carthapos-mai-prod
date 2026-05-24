; CarthaPos Custom NSIS Installer Script
; This script ensures the data folder is created at installation time
; and sets proper permissions for non-admin users to read/write

!macro customInstall
  ; Create the 'data' folder in the installation directory
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\backups"
  CreateDirectory "$INSTDIR\data\logs"
  
  DetailPrint "✅ Creating application data folders..."
  DetailPrint "  📁 Data folder: $INSTDIR\data\"
  DetailPrint "  📁 Backups folder: $INSTDIR\data\backups\"
  DetailPrint "  📁 Logs folder: $INSTDIR\data\logs\"
  
  ; ⚠️ CRITICAL: Set folder permissions to make data folder writable by all users
  ; This allows non-admin users to create/modify database files
  ;
  ; nsExec::Exec properly pushes exit code to stack (unlike ExecWait).
  ; Uses $SYSDIR\icacls.exe to avoid 32-bit→64-bit Wow64 redirection issues.
  ; /grant:r replaces existing permissions, (OI)=files inherit, (CI)=folders inherit, F=Full Control.
  DetailPrint "🔐 Setting folder permissions for database access..."
  
  DetailPrint "  INSTDIR: $INSTDIR"
  DetailPrint "  SYSDIR: $SYSDIR"
  
  ; Try 1: BUILTIN\Users (exists on ALL Windows systems, all locales)
  ClearErrors
  nsExec::Exec '"$SYSDIR\icacls.exe" "$INSTDIR\data" /grant:r "BUILTIN\Users:(OI)(CI)F" /T'
  Pop $0
  DetailPrint "icacls Users exit code: $0"
  ${If} $0 == 0
    DetailPrint "✅ Granted BUILTIN\\Users full access"
    Goto done_permissions
  ${EndIf}
  
  ; Try 2: Everyone (if BUILTIN\Users fails)
  ClearErrors
  nsExec::Exec '"$SYSDIR\icacls.exe" "$INSTDIR\data" /grant:r "Everyone:(OI)(CI)F" /T'
  Pop $1
  DetailPrint "icacls Everyone exit code: $1"
  ${If} $1 == 0
    DetailPrint "✅ Granted Everyone full access"
    Goto done_permissions
  ${EndIf}
  
  ; Try 3: Fallback without /grant:r (adds instead of replaces)
  ClearErrors
  nsExec::Exec '"$SYSDIR\icacls.exe" "$INSTDIR\data" /grant "Users:(OI)(CI)F" /T'
  Pop $2
  DetailPrint "icacls Users (append) exit code: $2"
  ${If} $2 == 0
    DetailPrint "✅ Granted Users full access (appended)"
    Goto done_permissions
  ${EndIf}
  
  DetailPrint "⚠️  WARNING: All icacls attempts failed."
  DetailPrint "   The app will attempt to fix permissions via UAC prompt at first launch."
  
  done_permissions:
!macroend

!macro customUnInstall
  ; Remove data folders on uninstall (optional - user may want to keep data)
  ; Uncomment the lines below if you want to delete data on uninstall
  ; RMDir /r "$INSTDIR\data\backups"
  ; RMDir /r "$INSTDIR\data\logs"
  ; Note: We do NOT delete the main $INSTDIR\data folder to preserve user data
  DetailPrint "ℹ️ User data preserved in: $INSTDIR\data\"
!macroend
