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
  DetailPrint "🔐 Setting folder permissions for database access..."
  nsExec::ExecToLog 'icacls.exe "$INSTDIR\data" /grant:r "Everyone:(OI)(CI)F" /T'
  
  ; Verify permissions were set correctly
  ${If} ${Errors}
    DetailPrint "⚠️  Warning: Could not set folder permissions. Admin rights may be required."
    DetailPrint "   The app will attempt to use AppData folder as fallback."
  ${Else}
    DetailPrint "✅ Folder permissions set successfully - all users can read/write"
  ${EndIf}
!macroend

!macro customUnInstall
  ; Remove data folders on uninstall (optional - user may want to keep data)
  ; Uncomment the lines below if you want to delete data on uninstall
  ; RMDir /r "$INSTDIR\data\backups"
  ; RMDir /r "$INSTDIR\data\logs"
  ; Note: We do NOT delete the main $INSTDIR\data folder to preserve user data
  DetailPrint "ℹ️ User data preserved in: $INSTDIR\data\"
!macroend
